create or replace function public.finalize_expired_projects()
returns table (
  project_id uuid,
  finalized_status public.project_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select
      p.id,
      case
        when p.funding_type = 'all_in'::public.funding_type
          then 'succeeded'::public.project_status
        when p.current_amount >= p.goal_amount
          then 'succeeded'::public.project_status
        else 'failed'::public.project_status
      end as next_status
    from public.projects p
    where p.status in (
      'live'::public.project_status,
      'failed'::public.project_status
    )
      and p.end_at is not null
      and p.end_at <= now() - interval '30 minutes'
    for update of p skip locked
  ),
  updated as (
    update public.projects p
    set status = candidates.next_status
    from candidates
    where p.id = candidates.id
      and p.status is distinct from candidates.next_status
    returning
      p.id,
      p.status
  )
  select
    updated.id,
    updated.status
  from updated;
end;
$$;

comment on function public.finalize_expired_projects() is
  '募集終了から30分経過したプロジェクトを、方式と達成金額に基づいて succeeded または failed に更新する。';

revoke all
on function public.finalize_expired_projects()
from public;

revoke all
on function public.finalize_expired_projects()
from anon;

revoke all
on function public.finalize_expired_projects()
from authenticated;

grant execute
on function public.finalize_expired_projects()
to service_role;