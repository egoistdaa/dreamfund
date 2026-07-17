alter table public.support_conversations
  add column if not exists creator_last_read_at timestamptz,
  add column if not exists backer_last_read_at timestamptz;


-- 既存の会話は、すでに確認済みとして扱う。
update public.support_conversations
set
  creator_last_read_at =
    coalesce(creator_last_read_at, last_message_at),
  backer_last_read_at =
    coalesce(backer_last_read_at, last_message_at)
where creator_last_read_at is null
   or backer_last_read_at is null;


-- 相手から届いた未読メッセージを効率よく確認するための索引。
create index if not exists
  support_messages_conversation_type_created_idx
on public.support_messages (
  conversation_id,
  message_type,
  created_at desc
);


-- 会話を開いた本人の既読時刻だけを更新する。
create or replace function public.mark_support_conversation_read(
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
  v_owner_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  select
    c.backer_id,
    p.owner_id
  into
    v_backer_id,
    v_owner_id
  from public.support_conversations as c
  join public.projects as p
    on p.id = c.project_id
  where c.id = p_conversation_id;

  if not found then
    raise exception '会話が見つかりません';
  end if;

  if v_user_id = v_owner_id then
    update public.support_conversations
    set creator_last_read_at = now()
    where id = p_conversation_id;

  elsif v_user_id = v_backer_id then
    update public.support_conversations
    set backer_last_read_at = now()
    where id = p_conversation_id;

  else
    raise exception 'この会話を既読にする権限がありません';
  end if;
end;
$$;


revoke all
on function public.mark_support_conversation_read(uuid)
from public;

grant execute
on function public.mark_support_conversation_read(uuid)
to authenticated;