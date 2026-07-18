create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = auth.uid();
end;
$$;


revoke all
on function public.mark_notification_read(uuid)
from public;


grant execute
on function public.mark_notification_read(uuid)
to authenticated;