create or replace function public.mark_backer_support_conversation_read(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_backer_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  select c.backer_id
  into v_backer_id
  from public.support_conversations as c
  where c.id = p_conversation_id;

  if not found then
    raise exception '会話が見つかりません';
  end if;

  if v_user_id <> v_backer_id then
    raise exception 'この会話を既読にする権限がありません';
  end if;

  update public.support_conversations
  set backer_last_read_at = now()
  where id = p_conversation_id;
end;
$$;

revoke all
on function public.mark_backer_support_conversation_read(uuid)
from public;

grant execute
on function public.mark_backer_support_conversation_read(uuid)
to authenticated;