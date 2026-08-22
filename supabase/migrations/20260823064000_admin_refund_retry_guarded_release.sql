-- Atomically guard administrator refund retry releases against
-- webhook and stale-worker state changes before reusing the
-- existing refund release function.

create or replace function public.release_admin_refund_retry_claim(
  p_refund_id uuid,
  p_expected_admin_retry_requested_at timestamptz,
  p_expected_attempt_count integer,
  p_error text
)
returns table (
  released boolean,
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
  v_pledge public.pledges%rowtype;
  v_settlement public.project_settlements%rowtype;
  v_pledge_found boolean;
  v_settlement_found boolean;
  v_safe_error text;
begin
  if p_refund_id is null then
    return query
    select
      false,
      null::uuid,
      null::public.refund_status,
      null::boolean,
      null::timestamptz;

    return;
  end if;

  -- Preserve the established financial lock order and keep these
  -- locks until the nested release call and this transaction finish:
  -- refunds -> pledges -> project_settlements.
  select r.*
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    return query
    select
      false,
      p_refund_id,
      null::public.refund_status,
      null::boolean,
      null::timestamptz;

    return;
  end if;

  select p.*
  into v_pledge
  from public.pledges p
  where p.id = v_refund.pledge_id
  for update;

  v_pledge_found := found;

  select ps.*
  into v_settlement
  from public.project_settlements ps
  where ps.project_id = v_refund.project_id
  for update;

  v_settlement_found := found;

  if
    p_expected_admin_retry_requested_at is null
    or p_expected_attempt_count is null
    or p_expected_attempt_count < 1
    or v_refund.status is distinct from
      'processing'::public.refund_status
    or v_refund.manual_review_required is distinct from false
    or v_refund.admin_retry_requested_at is null
    or v_refund.admin_retry_requested_at is distinct from
      p_expected_admin_retry_requested_at
    or v_refund.attempt_count is distinct from
      p_expected_attempt_count
    or v_refund.stripe_refund_id is not null
    or v_refund.stripe_status is not null
    or v_refund.succeeded_at is not null
    or not v_pledge_found
    or v_pledge.id is distinct from v_refund.pledge_id
    or v_pledge.project_id is distinct from
      v_refund.project_id
    or v_pledge.status is distinct from
      'paid'::public.pledge_status
    or v_pledge.stripe_payment_intent_id is null
    or v_refund.amount is distinct from v_pledge.amount
    or not v_settlement_found
    or v_settlement.project_id is distinct from
      v_refund.project_id
    or v_settlement.status is distinct from 'manual_review'
    or v_settlement.final_status is distinct from
      'failed'::public.project_status
    or v_settlement.settlement_locked_at is null
    or v_settlement.refund_eligible_at is null
  then
    return query
    select
      false,
      v_refund.id,
      v_refund.status,
      v_refund.manual_review_required,
      v_refund.next_retry_at;

    return;
  end if;

  v_safe_error := left(
    coalesce(
      nullif(btrim(p_error), ''),
      'Administrator refund retry processing failed'
    ),
    2000
  );

  return query
  select
    true,
    released_refund.refund_id,
    released_refund.refund_status,
    released_refund.manual_review_required,
    released_refund.next_retry_at
  from public.release_refund_claim(
    p_refund_id,
    v_safe_error,
    900
  ) released_refund;
end;
$$;

comment on function public.release_admin_refund_retry_claim(
  uuid,
  timestamptz,
  integer,
  text
) is
  'Releases an administrator refund retry claim only when its marker, attempt generation, Stripe state, pledge, and settlement still match the locked expected state.';

revoke all
on function public.release_admin_refund_retry_claim(
  uuid,
  timestamptz,
  integer,
  text
)
from public, anon, authenticated;

grant execute
on function public.release_admin_refund_retry_claim(
  uuid,
  timestamptz,
  integer,
  text
)
to service_role;
