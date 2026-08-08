-- DreamFund
-- lock_project_settlement内のON CONFLICTで、
-- 戻り値のproject_idとテーブル列が曖昧になる問題を修正する。


create or replace function public.lock_project_settlement(
  p_project_id uuid
)
returns table (
  locked boolean,
  project_id uuid,
  settlement_status text,
  final_status public.project_status,
  unresolved_payment_count integer,
  refund_count integer,
  settlement_locked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_settlement public.project_settlements%rowtype;

  v_pending_count integer;
  v_paid_amount bigint;
  v_supporter_count integer;

  v_final_status public.project_status;
  v_settlement_status text;

  v_refund_count integer := 0;
  v_locked_at timestamptz;
begin
  if p_project_id is null then
    raise exception 'プロジェクトIDが必要です';
  end if;


  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'プロジェクトが見つかりません';
  end if;


  if v_project.status not in (
    'live'::public.project_status,
    'succeeded'::public.project_status,
    'failed'::public.project_status
  ) then
    raise exception '現在精算できないプロジェクトです';
  end if;


  if v_project.end_at is null then
    raise exception '募集終了日時が設定されていません';
  end if;


  if v_project.end_at > now() - interval '30 minutes' then
    raise exception '募集終了後の決済確認猶予期間中です';
  end if;


  insert into public.project_settlements (
    project_id,
    status,
    last_checked_at,
    attempt_count
  )
  values (
    v_project.id,
    'checking',
    now(),
    1
  )
  on conflict on constraint project_settlements_project_id_key
  do update
  set
    last_checked_at = now(),
    attempt_count =
      public.project_settlements.attempt_count + 1,
    last_error = null
  returning *
  into v_settlement;


  if v_settlement.settlement_locked_at is not null then
    select count(*)::integer
    into v_refund_count
    from public.refunds
    where refunds.project_id = v_project.id;

    return query
    select
      true,
      v_project.id,
      v_settlement.status,
      v_settlement.final_status,
      v_settlement.unresolved_payment_count,
      v_refund_count,
      v_settlement.settlement_locked_at;

    return;
  end if;


  select count(*)::integer
  into v_pending_count
  from public.pledges
  where pledges.project_id = v_project.id
    and pledges.status = 'pending'::public.pledge_status;


  if v_pending_count > 0 then
    update public.project_settlements
    set
      status = 'waiting_for_payments',
      unresolved_payment_count = v_pending_count,
      last_checked_at = now(),
      next_check_at = now() + interval '5 minutes',
      last_error = null
    where project_settlements.project_id = v_project.id
    returning *
    into v_settlement;

    return query
    select
      false,
      v_project.id,
      v_settlement.status,
      v_settlement.final_status,
      v_pending_count,
      0,
      v_settlement.settlement_locked_at;

    return;
  end if;


  select
    coalesce(sum(pledges.amount), 0),
    count(distinct pledges.backer_id)::integer
  into
    v_paid_amount,
    v_supporter_count
  from public.pledges
  where pledges.project_id = v_project.id
    and pledges.status = 'paid'::public.pledge_status;


  if v_project.funding_type = 'all_in'::public.funding_type then
    v_final_status := 'succeeded'::public.project_status;
  elsif v_paid_amount >= v_project.goal_amount then
    v_final_status := 'succeeded'::public.project_status;
  else
    v_final_status := 'failed'::public.project_status;
  end if;


  v_locked_at := now();


  if v_final_status = 'succeeded'::public.project_status then
    v_settlement_status := 'locked_succeeded';
  else
    v_settlement_status := 'locked_failed';
  end if;


  update public.projects
  set
    current_amount = v_paid_amount,
    supporters_count = v_supporter_count,
    status = v_final_status,
    updated_at = now()
  where projects.id = v_project.id;


  if v_final_status = 'failed'::public.project_status then
    insert into public.refunds (
      pledge_id,
      project_id,
      reason,
      amount,
      status,
      idempotency_key,
      approved_at
    )
    select
      pledges.id,
      pledges.project_id,
      'All or Nothing方式の目標未達成',
      pledges.amount,
      'approved'::public.refund_status,
      'dreamfund-refund-' || pledges.id::text,
      v_locked_at
    from public.pledges
    where pledges.project_id = v_project.id
      and pledges.status = 'paid'::public.pledge_status
    on conflict (pledge_id)
    do nothing;

    get diagnostics v_refund_count = row_count;
  end if;


  update public.project_settlements
  set
    status = v_settlement_status,
    final_status = v_final_status,
    unresolved_payment_count = 0,
    locked_current_amount = v_paid_amount,
    locked_supporters_count = v_supporter_count,
    last_checked_at = v_locked_at,
    next_check_at = null,
    settlement_locked_at = v_locked_at,
    refund_eligible_at =
      case
        when v_final_status = 'failed'::public.project_status
          then v_locked_at
        else null
      end,
    last_error = null
  where project_settlements.project_id = v_project.id
  returning *
  into v_settlement;


  return query
  select
    true,
    v_project.id,
    v_settlement.status,
    v_settlement.final_status,
    v_settlement.unresolved_payment_count,
    v_refund_count,
    v_settlement.settlement_locked_at;
end;
$$;


comment on function public.lock_project_settlement(uuid) is
  'Stripe上の未確定決済確認後、募集結果を最終ロックし、All or Nothing未達成時の返金レコードを作成する。pending支援が残っている場合はロックしない。';


revoke all
on function public.lock_project_settlement(uuid)
from public;

revoke all
on function public.lock_project_settlement(uuid)
from anon;

revoke all
on function public.lock_project_settlement(uuid)
from authenticated;

grant execute
on function public.lock_project_settlement(uuid)
to service_role;