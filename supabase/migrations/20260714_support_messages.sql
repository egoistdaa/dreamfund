create table public.support_conversations (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete restrict,

  backer_id uuid not null
    references public.public_profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),

  constraint support_conversations_project_backer_unique
    unique (project_id, backer_id)
);


create table public.support_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.support_conversations(id)
    on delete cascade,

  sender_id uuid not null
    references public.public_profiles(id)
    on delete restrict,

  message_type text not null,

  body text not null,

  created_at timestamptz not null default now(),

  constraint support_messages_type_check
    check (
      message_type in (
        'support',
        'creator_reply'
      )
    ),

  constraint support_messages_body_check
    check (
      char_length(btrim(body)) between 1 and 1000
    )
);


create index support_conversations_project_last_message_idx
on public.support_conversations (
  project_id,
  last_message_at desc
);


create index support_conversations_backer_last_message_idx
on public.support_conversations (
  backer_id,
  last_message_at desc
);


create index support_messages_conversation_created_idx
on public.support_messages (
  conversation_id,
  created_at
);
alter table public.support_conversations
enable row level security;

alter table public.support_messages
enable row level security;


revoke all
on table public.support_conversations
from anon, authenticated;

revoke all
on table public.support_messages
from anon, authenticated;


grant select
on table public.support_conversations
to authenticated;

grant select
on table public.support_messages
to authenticated;
create policy "support conversations are visible to participants"
on public.support_conversations
for select
to authenticated
using (
  backer_id = auth.uid()
  or exists (
    select 1
    from public.projects as p
    where p.id = support_conversations.project_id
      and p.owner_id = auth.uid()
  )
  or public.is_staff()
);
create policy "support messages are visible to participants"
on public.support_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_conversations as c
    where c.id = support_messages.conversation_id
      and (
        c.backer_id = auth.uid()
        or exists (
          select 1
          from public.projects as p
          where p.id = c.project_id
            and p.owner_id = auth.uid()
        )
        or public.is_staff()
      )
  )
);
create or replace function public.send_support_message(
  p_project_slug text,
  p_body text
)
returns table (
  conversation_id uuid,
  message_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_project public.projects%rowtype;
  v_conversation_id uuid;
  v_message_id uuid;
  v_trimmed_body text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  v_trimmed_body := btrim(p_body);

  if v_trimmed_body is null
     or char_length(v_trimmed_body) < 1 then
    raise exception 'メッセージを入力してください';
  end if;

  if char_length(v_trimmed_body) > 1000 then
    raise exception 'メッセージは1000文字以内で入力してください';
  end if;

  select *
  into v_project
  from public.projects
  where slug = p_project_slug;

  if not found then
    raise exception 'プロジェクトが見つかりません';
  end if;

  if v_project.owner_id = v_user_id then
    raise exception '自分のプロジェクトには応援メッセージを送れません';
  end if;

  if not exists (
    select 1
    from public.pledges as p
    where p.project_id = v_project.id
      and p.backer_id = v_user_id
      and p.status = 'paid'::public.pledge_status
  ) then
    raise exception '支援が完了したユーザーだけメッセージを送れます';
  end if;

  insert into public.support_conversations (
    project_id,
    backer_id,
    created_at,
    updated_at,
    last_message_at
  )
  values (
    v_project.id,
    v_user_id,
    now(),
    now(),
    now()
  )
  on conflict on constraint support_conversations_project_backer_unique
  do update
  set
    updated_at = now(),
    last_message_at = now()
  returning id into v_conversation_id;

  insert into public.support_messages (
    conversation_id,
    sender_id,
    message_type,
    body
  )
  values (
    v_conversation_id,
    v_user_id,
    'support',
    v_trimmed_body
  )
  returning id into v_message_id;

  return query
  select
    v_conversation_id,
    v_message_id;
end;
$$;


revoke all
on function public.send_support_message(text, text)
from public;

grant execute
on function public.send_support_message(text, text)
to authenticated;

create or replace function public.reply_to_support_message(
  p_conversation_id uuid,
  p_body text
)
returns table (
  conversation_id uuid,
  message_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_owner_id uuid;
  v_message_id uuid;
  v_trimmed_body text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  v_trimmed_body := btrim(p_body);

  if v_trimmed_body is null
     or char_length(v_trimmed_body) < 1 then
    raise exception '返信を入力してください';
  end if;

  if char_length(v_trimmed_body) > 1000 then
    raise exception '返信は1000文字以内で入力してください';
  end if;

  select p.owner_id
  into v_owner_id
  from public.support_conversations as c
  join public.projects as p
    on p.id = c.project_id
  where c.id = p_conversation_id;

  if not found then
    raise exception '会話が見つかりません';
  end if;

  if v_owner_id <> v_user_id then
    raise exception 'この会話へ返信できるのはプロジェクト投稿者だけです';
  end if;

  insert into public.support_messages (
    conversation_id,
    sender_id,
    message_type,
    body
  )
  values (
    p_conversation_id,
    v_user_id,
    'creator_reply',
    v_trimmed_body
  )
  returning id into v_message_id;

  update public.support_conversations
  set
    updated_at = now(),
    last_message_at = now()
  where id = p_conversation_id;

  return query
  select
    p_conversation_id,
    v_message_id;
end;
$$;


revoke all
on function public.reply_to_support_message(uuid, text)
from public;

grant execute
on function public.reply_to_support_message(uuid, text)
to authenticated;