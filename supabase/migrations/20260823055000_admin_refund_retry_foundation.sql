-- DreamFund admin refund retry foundation
--
-- This migration:
-- 1. Adds an explicit marker for administrator-requested refund retries.
-- 2. Atomically records the administrator request and its audit log.
-- 3. Allows only the marked refund to be claimed while its settlement
--    remains in manual_review.
-- 4. Clears the marker when the administrator retry reaches a terminal
--    state or release returns it to manual review.


-- ============================================================
-- 1. Explicit administrator retry marker
-- ============================================================

alter table public.refunds
add column admin_retry_requested_at timestamptz null;

comment on column public.refunds.admin_retry_requested_at is
  '管理者が返金の安全な再試行を明示的に要求した日時。有効な再試行サイクル中のみ保持する。';

-- Existing rows receive null for the new nullable column, so they all
-- satisfy this constraint without changing existing refund data.
alter table public.refunds
add constraint refunds_admin_retry_marker_state_check
check (
  admin_retry_requested_at is null
  or (
    manual_review_required = false
    and succeeded_at is null
    and (
      (
        status = 'approved'::public.refund_status
        and stripe_refund_id is null
        and stripe_status is null
      )
      or
      (
        status = 'processing'::public.refund_status
        and (
          (
            stripe_refund_id is null
            and stripe_status is null
          )
          or
          (
            stripe_refund_id is not null
            and stripe_status in (
              'pending',
              'requires_action'
            )
          )
        )
      )
    )
  )
);


-- ============================================================
-- 2. Request one refund retry and record its audit log
-- ============================================================

create or replace function public.admin_request_refund_retry(
  p_refund_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns table (
  requested boolean,
  refund_id uuid,
  project_id uuid,
  admin_retry_requested_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds%rowtype;
  v_pledge public.pledges%rowtype;
  v_settlement public.project_settlements%rowtype;
  v_reason text;
  v_retry_requested_at timestamptz;
begin
  if p_refund_id is null then
    raise exception '返金IDが必要です';
  end if;

  if p_actor_user_id is null then
    raise exception '管理者ユーザーIDが必要です';
  end if;

  v_reason := btrim(coalesce(p_reason, ''));

  if v_reason = '' then
    raise exception '再試行理由が必要です';
  end if;

  if char_length(v_reason) > 500 then
    raise exception '再試行理由は500文字以内で入力してください';
  end if;

  if not exists (
    select 1
    from public.profiles_private pp
    where pp.id = p_actor_user_id
      and pp.role = 'admin'::public.user_role
  ) then
    raise exception '管理者権限を確認できません';
  end if;

  -- Preserve the established financial lock order:
  -- refunds -> pledges -> project_settlements.
  select r.*
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    raise exception '返金レコードが見つかりません';
  end if;

  select p.*
  into v_pledge
  from public.pledges p
  where p.id = v_refund.pledge_id
  for update;

  if not found then
    raise exception '支援レコードが見つかりません';
  end if;

  select ps.*
  into v_settlement
  from public.project_settlements ps
  where ps.project_id = v_refund.project_id
  for update;

  if not found then
    raise exception '精算レコードが見つかりません';
  end if;

  if v_refund.manual_review_required is distinct from true then
    raise exception '手動確認が必要な返金のみ再試行できます';
  end if;

  if v_refund.admin_retry_requested_at is not null then
    raise exception 'この返金は既に管理者再試行待ちです';
  end if;

  if v_refund.status is distinct from
    'approved'::public.refund_status
  then
    raise exception '承認済みの返金のみ再試行できます';
  end if;

  if v_refund.attempt_count < 5 then
    raise exception '自動再試行上限に達した返金のみ再試行できます';
  end if;

  if
    v_refund.stripe_refund_id is not null
    or v_refund.stripe_status is not null
    or v_refund.succeeded_at is not null
  then
    raise exception 'Stripe返金が関連付けられた返金は再試行できません';
  end if;

  if
    v_refund.processing_started_at is not null
    or v_refund.next_retry_at is not null
  then
    raise exception '処理中または自動再試行待ちの返金は再試行できません';
  end if;

  if v_refund.approved_at is null then
    raise exception '承認日時がない返金は再試行できません';
  end if;

  if
    v_refund.idempotency_key is null
    or btrim(v_refund.idempotency_key) = ''
  then
    raise exception '返金の冪等性キーがありません';
  end if;

  if v_pledge.project_id is distinct from
    v_refund.project_id
  then
    raise exception '返金と支援のプロジェクトが一致しません';
  end if;

  if v_pledge.status is distinct from
    'paid'::public.pledge_status
  then
    raise exception '支払済みの支援のみ再試行できます';
  end if;

  if v_pledge.stripe_payment_intent_id is null then
    raise exception '支援にPaymentIntent IDがありません';
  end if;

  if v_refund.amount is distinct from
    v_pledge.amount
  then
    raise exception '返金額と支援額が一致しません';
  end if;

  if v_settlement.status is distinct from
    'manual_review'
  then
    raise exception '手動確認中の精算に属する返金のみ再試行できます';
  end if;

  if v_settlement.final_status is distinct from
    'failed'::public.project_status
  then
    raise exception '不成立確定済みの精算に属する返金のみ再試行できます';
  end if;

  if
    v_settlement.settlement_locked_at is null
    or v_settlement.refund_eligible_at is null
  then
    raise exception '返金可能としてロック済みの精算ではありません';
  end if;

  v_retry_requested_at := now();

  update public.refunds r
  set
    manual_review_required = false,
    manual_review_reason = null,
    next_retry_at = v_retry_requested_at,
    admin_retry_requested_at =
      v_retry_requested_at
  where r.id = v_refund.id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_actor_user_id,
    'refund.retry_requested',
    'refund',
    v_refund.id::text,
    jsonb_build_object(
      'reason', v_reason,
      'project_id', v_refund.project_id,
      'pledge_id', v_refund.pledge_id,
      'previous_status', v_refund.status,
      'previous_attempt_count',
        v_refund.attempt_count,
      'previous_manual_review_required',
        v_refund.manual_review_required,
      'requested_manual_review_required',
        false
    )
  );

  return query
  select
    true,
    v_refund.id,
    v_refund.project_id,
    v_retry_requested_at;
end;
$$;

comment on function public.admin_request_refund_retry(
  uuid,
  uuid,
  text
) is
  '管理者が選択したmanual review返金だけを再試行可能にし、操作理由を監査ログへ原子的に記録する。精算状態は変更しない。';


-- ============================================================
-- 3. Claim one refund for Stripe processing
-- ============================================================

-- The return type changes to include admin_retry_requested_at,
-- so PostgreSQL requires the old function to be dropped first.
drop function public.claim_next_refund();

create function public.claim_next_refund()
returns table (
  refund_id uuid,
  pledge_id uuid,
  project_id uuid,
  amount bigint,
  stripe_payment_intent_id text,
  idempotency_key text,
  attempt_count integer,
  admin_retry_requested_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds%rowtype;
  v_payment_intent_id text;
  v_attempt_count integer;
begin
  select r.*
  into v_refund
  from public.refunds r
  join public.project_settlements ps
    on ps.project_id = r.project_id
  join public.pledges p
    on p.id = r.pledge_id
  where
    r.manual_review_required = false
    and r.stripe_refund_id is null
    and (
      (
        r.admin_retry_requested_at is null
        and (
          (
            r.status = 'approved'::public.refund_status
            and (
              r.next_retry_at is null
              or r.next_retry_at <= now()
            )
          )
          or
          (
            r.status = 'processing'::public.refund_status
            and (
              r.processing_started_at is null
              or r.processing_started_at
                <= now() - interval '15 minutes'
            )
          )
        )
        and ps.status in (
          'locked_failed',
          'refunding'
        )
      )
      or
      (
        r.admin_retry_requested_at is not null
        and r.attempt_count >= 5
        and r.stripe_status is null
        and r.succeeded_at is null
        and (
          (
            r.status = 'approved'::public.refund_status
            and r.next_retry_at is not null
            and r.next_retry_at <= now()
          )
          or
          (
            r.status = 'processing'::public.refund_status
            and (
              r.processing_started_at is null
              or r.processing_started_at
                <= now() - interval '15 minutes'
            )
          )
        )
        and ps.status = 'manual_review'
        and ps.refund_eligible_at is not null
      )
    )
    and ps.final_status =
      'failed'::public.project_status
    and ps.settlement_locked_at is not null
    and p.status = 'paid'::public.pledge_status
    and p.stripe_payment_intent_id is not null
    and r.amount = p.amount
  order by
    coalesce(
      r.next_retry_at,
      r.processing_started_at,
      r.approved_at,
      r.created_at
    ),
    r.created_at
  for update of r skip locked
  limit 1;

  if not found then
    return;
  end if;

  select p.stripe_payment_intent_id
  into v_payment_intent_id
  from public.pledges p
  where p.id = v_refund.pledge_id
  for update;

  update public.refunds r
  set
    status = 'processing'::public.refund_status,
    attempt_count = r.attempt_count + 1,
    processing_started_at = now(),
    next_retry_at = null,
    last_error = null
  where r.id = v_refund.id
  returning r.attempt_count
  into v_attempt_count;

  update public.project_settlements ps
  set
    status = 'refunding',
    last_checked_at = now(),
    next_check_at = null,
    last_error = null
  where ps.project_id = v_refund.project_id
    and ps.status = 'locked_failed';

  return query
  select
    v_refund.id,
    v_refund.pledge_id,
    v_refund.project_id,
    v_refund.amount::bigint,
    v_payment_intent_id,
    v_refund.idempotency_key,
    v_attempt_count,
    v_refund.admin_retry_requested_at;
end;
$$;

comment on function public.claim_next_refund() is
  'Atomically claims one eligible refund for Stripe processing. A marked refund may be reclaimed while its settlement remains in manual_review, and stale claims without a Stripe Refund ID can be reclaimed after 15 minutes.';


-- ============================================================
-- 4. Release a claimed refund after a Stripe API error
-- ============================================================

create or replace function public.release_refund_claim(
  p_refund_id uuid,
  p_error text,
  p_retry_after_seconds integer default 900
)
returns table (
  refund_id uuid,
  refund_status public.refund_status,
  manual_review_required boolean,
  next_retry_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds%rowtype;
  v_manual_review boolean;
  v_next_retry_at timestamptz;
  v_admin_retry boolean;
begin
  if p_refund_id is null then
    raise exception 'Refund ID is required';
  end if;

  select r.*
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    raise exception 'Refund record was not found';
  end if;

  if v_refund.status <> 'processing'::public.refund_status then
    return query
    select
      v_refund.id,
      v_refund.status,
      v_refund.manual_review_required,
      v_refund.next_retry_at;

    return;
  end if;

  v_admin_retry :=
    v_refund.admin_retry_requested_at is not null;
  v_manual_review := v_refund.attempt_count >= 5;

  v_next_retry_at :=
    case
      when v_manual_review then null
      else now()
        + make_interval(
            secs => greatest(
              coalesce(p_retry_after_seconds, 900),
              60
            )
          )
    end;

  update public.refunds r
  set
    status = 'approved'::public.refund_status,
    processing_started_at = null,
    next_retry_at = v_next_retry_at,
    last_error = left(
      coalesce(p_error, 'Unknown Stripe API error'),
      2000
    ),
    manual_review_required = v_manual_review,
    manual_review_reason =
      case
        when v_manual_review
          then 'Stripe refund API failed repeatedly'
        else null
      end,
    admin_retry_requested_at =
      case
        when v_admin_retry and v_manual_review
          then null
        else r.admin_retry_requested_at
      end
  where r.id = v_refund.id
  returning *
  into v_refund;

  if v_manual_review then
    update public.project_settlements ps
    set
      status = 'manual_review',
      last_checked_at = now(),
      next_check_at = null,
      last_error =
        'Refund requires manual review: '
        || v_refund.id::text
    where ps.project_id = v_refund.project_id
      and (
        not v_admin_retry
        or ps.status <> 'manual_review'
      );
  end if;

  return query
  select
    v_refund.id,
    v_refund.status,
    v_refund.manual_review_required,
    v_refund.next_retry_at;
end;
$$;

comment on function public.release_refund_claim(uuid, text, integer) is
  'Requeues a claimed refund after a Stripe API error. After five attempts it is stopped for manual review. Administrator retry markers are cleared when their retry returns to manual review.';


-- ============================================================
-- 5. Apply the latest Stripe Refund status atomically
-- ============================================================

create or replace function public.apply_stripe_refund_status(
  p_refund_id uuid,
  p_stripe_refund_id text,
  p_stripe_status text,
  p_failure_reason text default null
)
returns table (
  refund_id uuid,
  refund_status public.refund_status,
  stripe_status text,
  manual_review_required boolean,
  settlement_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds%rowtype;
  v_pledge public.pledges%rowtype;
  v_remaining_count integer;
  v_manual_review boolean := false;
  v_admin_retry boolean;
begin
  if p_refund_id is null then
    raise exception 'Refund ID is required';
  end if;

  if p_stripe_refund_id is null
    or btrim(p_stripe_refund_id) = ''
  then
    raise exception 'Stripe Refund ID is required';
  end if;

  if p_stripe_status is null
    or p_stripe_status not in (
      'pending',
      'requires_action',
      'succeeded',
      'failed',
      'canceled'
    )
  then
    raise exception
      'Unsupported Stripe Refund status: %',
      p_stripe_status;
  end if;

  select r.*
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    raise exception 'Refund record was not found';
  end if;

  v_admin_retry :=
    v_refund.admin_retry_requested_at is not null;

  if v_refund.stripe_refund_id is not null
    and v_refund.stripe_refund_id
      <> p_stripe_refund_id
  then
    raise exception
      'Stripe Refund ID does not match the stored refund';
  end if;

  -- Never regress a confirmed successful refund when an older
  -- Stripe webhook is delivered after the succeeded event.
  if v_refund.status = 'done'::public.refund_status
    and v_refund.stripe_status = 'succeeded'
  then
    return query
    select
      v_refund.id,
      v_refund.status,
      v_refund.stripe_status,
      v_refund.manual_review_required,
      ps.status
    from public.project_settlements ps
    where ps.project_id = v_refund.project_id;

    return;
  end if;

  -- Do not move a terminal failed or canceled refund back to
  -- pending when an older webhook arrives later.
  if v_refund.status = 'rejected'::public.refund_status
    and v_refund.stripe_status in (
      'failed',
      'canceled'
    )
    and p_stripe_status in (
      'pending',
      'requires_action'
    )
  then
    return query
    select
      v_refund.id,
      v_refund.status,
      v_refund.stripe_status,
      v_refund.manual_review_required,
      ps.status
    from public.project_settlements ps
    where ps.project_id = v_refund.project_id;

    return;
  end if;

  select p.*
  into v_pledge
  from public.pledges p
  where p.id = v_refund.pledge_id
  for update;

  if not found then
    raise exception 'Pledge record was not found';
  end if;

  if p_stripe_status = 'succeeded' then
    if v_pledge.status =
      'paid'::public.pledge_status
    then
      update public.pledges p
      set
        status = 'refunded'::public.pledge_status,
        updated_at = now()
      where p.id = v_pledge.id;
    elsif v_pledge.status <>
      'refunded'::public.pledge_status
    then
      v_manual_review := true;
    end if;

    update public.refunds r
    set
      status = 'done'::public.refund_status,
      stripe_refund_id = p_stripe_refund_id,
      stripe_status = p_stripe_status,
      succeeded_at = coalesce(
        r.succeeded_at,
        now()
      ),
      processing_started_at = coalesce(
        r.processing_started_at,
        now()
      ),
      next_retry_at = null,
      last_error =
        case
          when v_manual_review
            then 'Refund succeeded but pledge status was unexpected'
          else null
        end,
      manual_review_required = v_manual_review,
      manual_review_reason =
        case
          when v_manual_review
            then 'Refund succeeded but pledge status was unexpected'
          else null
        end,
      admin_retry_requested_at = null
    where r.id = v_refund.id
    returning *
    into v_refund;

    if v_manual_review then
      update public.project_settlements ps
      set
        status = 'manual_review',
        last_checked_at = now(),
        next_check_at = null,
        last_error =
          'Refund succeeded but pledge status requires review: '
          || v_refund.id::text
      where ps.project_id = v_refund.project_id
        and (
          not v_admin_retry
          or ps.status <> 'manual_review'
        );
    else
      select count(*)::integer
      into v_remaining_count
      from public.refunds r
      where r.project_id = v_refund.project_id
        and r.status <>
          'done'::public.refund_status;

      update public.project_settlements ps
      set
        status =
          case
            when v_remaining_count = 0
              then 'completed'
            else 'refunding'
          end,
        last_checked_at = now(),
        next_check_at =
          case
            when v_remaining_count = 0
              then null
            else ps.next_check_at
          end,
        last_error = null
      where ps.project_id = v_refund.project_id
        and ps.status <> 'manual_review';
    end if;

  elsif p_stripe_status in (
    'pending',
    'requires_action'
  ) then
    update public.refunds r
    set
      status = 'processing'::public.refund_status,
      stripe_refund_id = p_stripe_refund_id,
      stripe_status = p_stripe_status,
      processing_started_at = coalesce(
        r.processing_started_at,
        now()
      ),
      next_retry_at = now() + interval '15 minutes',
      last_error =
        case
          when p_stripe_status = 'requires_action'
            then 'Stripe refund requires additional action'
          else null
        end,
      manual_review_required = false,
      manual_review_reason = null
    where r.id = v_refund.id
    returning *
    into v_refund;

    update public.project_settlements ps
    set
      status = 'refunding',
      last_checked_at = now(),
      next_check_at = now() + interval '15 minutes',
      last_error = null
    where ps.project_id = v_refund.project_id
      and ps.status <> 'manual_review';

  else
    if v_pledge.status =
      'refunded'::public.pledge_status
    then
      update public.pledges p
      set
        status = 'paid'::public.pledge_status,
        updated_at = now()
      where p.id = v_pledge.id;
    end if;

    update public.refunds r
    set
      status = 'rejected'::public.refund_status,
      stripe_refund_id = p_stripe_refund_id,
      stripe_status = p_stripe_status,
      succeeded_at = null,
      next_retry_at = null,
      last_error = left(
        coalesce(
          p_failure_reason,
          'Stripe refund became '
            || p_stripe_status
        ),
        2000
      ),
      manual_review_required = true,
      manual_review_reason = left(
        coalesce(
          p_failure_reason,
          'Stripe refund became '
            || p_stripe_status
        ),
        2000
      ),
      admin_retry_requested_at = null
    where r.id = v_refund.id
    returning *
    into v_refund;

    update public.project_settlements ps
    set
      status = 'manual_review',
      last_checked_at = now(),
      next_check_at = null,
      last_error =
        'Stripe refund requires manual review: '
        || v_refund.id::text
    where ps.project_id = v_refund.project_id
      and (
        not v_admin_retry
        or ps.status <> 'manual_review'
      );
  end if;

  return query
  select
    v_refund.id,
    v_refund.status,
    v_refund.stripe_status,
    v_refund.manual_review_required,
    ps.status
  from public.project_settlements ps
  where ps.project_id = v_refund.project_id;
end;
$$;

comment on function public.apply_stripe_refund_status(
  uuid,
  text,
  text,
  text
) is
  'Atomically applies the latest Stripe Refund status to refunds, pledges, and project_settlements. An administrator retry marker is cleared for terminal statuses such as succeeded, failed, or canceled, and is retained for pending or requires_action.';


-- ============================================================
-- 6. Restrict function access
-- ============================================================

revoke all
on function public.admin_request_refund_retry(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

revoke all
on function public.claim_next_refund()
from public, anon, authenticated;

revoke all
on function public.release_refund_claim(
  uuid,
  text,
  integer
)
from public, anon, authenticated;

revoke all
on function public.apply_stripe_refund_status(
  uuid,
  text,
  text,
  text
)
from public, anon, authenticated;


grant execute
on function public.admin_request_refund_retry(
  uuid,
  uuid,
  text
)
to service_role;

grant execute
on function public.claim_next_refund()
to service_role;

grant execute
on function public.release_refund_claim(
  uuid,
  text,
  integer
)
to service_role;

grant execute
on function public.apply_stripe_refund_status(
  uuid,
  text,
  text,
  text
)
to service_role;
