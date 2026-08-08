-- DreamFund
-- 管理者が未ロックの手動確認精算を安全に再確認待ちへ戻す。
-- 状態変更と監査ログ記録を同一トランザクションで行う。

create or replace function public.admin_request_settlement_recheck(
  p_settlement_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns table (
  requested boolean,
  settlement_id uuid,
  project_id uuid,
  settlement_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settlement public.project_settlements%rowtype;
  v_project_status public.project_status;
begin
  if p_settlement_id is null then
    raise exception '精算IDが必要です';
  end if;

  if p_actor_user_id is null then
    raise exception '管理者ユーザーIDが必要です';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception '再確認理由が必要です';
  end if;

  select *
  into v_settlement
  from public.project_settlements
  where id = p_settlement_id
  for update;

  if not found then
    raise exception '精算が見つかりません';
  end if;

  if v_settlement.status <> 'manual_review' then
    raise exception '手動確認中の精算のみ再確認できます';
  end if;

  if
    v_settlement.settlement_locked_at is not null
    or v_settlement.final_status is not null
    or v_settlement.locked_current_amount is not null
    or v_settlement.locked_supporters_count is not null
    or v_settlement.refund_eligible_at is not null
  then
    raise exception 'ロック済みまたは確定済みの精算は再確認できません';
  end if;

  if exists (
    select 1
    from public.refunds
    where refunds.project_id = v_settlement.project_id
  ) then
    raise exception '返金レコードが存在する精算は再確認できません';
  end if;

  select projects.status
  into v_project_status
  from public.projects
  where projects.id = v_settlement.project_id;

  if not found then
    raise exception '対象プロジェクトが見つかりません';
  end if;

  if v_project_status not in (
    'live'::public.project_status,
    'succeeded'::public.project_status,
    'failed'::public.project_status
  ) then
    raise exception '現在再確認できないプロジェクトです';
  end if;

  update public.project_settlements
  set
    status = 'checking',
    unresolved_payment_count = 0,
    next_check_at = now(),
    last_error = null,
    updated_at = now()
  where id = v_settlement.id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_actor_user_id,
    'settlement.recheck_requested',
    'project_settlement',
    v_settlement.id::text,
    jsonb_build_object(
      'project_id', v_settlement.project_id,
      'reason', trim(p_reason),
      'previous_status', v_settlement.status,
      'previous_last_error', v_settlement.last_error,
      'previous_last_checked_at', v_settlement.last_checked_at,
      'requested_status', 'checking'
    )
  );

  return query
  select
    true,
    v_settlement.id,
    v_settlement.project_id,
    'checking'::text;
end;
$$;

comment on function public.admin_request_settlement_recheck(uuid, uuid, text) is
  '未ロックのmanual_review精算をcheckingへ戻し、管理者の操作理由を監査ログへ原子的に記録する。';

revoke all
on function public.admin_request_settlement_recheck(uuid, uuid, text)
from public;

revoke all
on function public.admin_request_settlement_recheck(uuid, uuid, text)
from anon;

revoke all
on function public.admin_request_settlement_recheck(uuid, uuid, text)
from authenticated;

grant execute
on function public.admin_request_settlement_recheck(uuid, uuid, text)
to service_role;