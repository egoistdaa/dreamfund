create or replace function public.create_support_message_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient_id uuid;
  v_project_id uuid;
  v_project_slug text;
  v_project_title text;
  v_notification_type text;
  v_href text;
begin
  select
    c.project_id,
    p.slug,
    p.title,
    case
      when new.message_type::text = 'support' then p.owner_id
      when new.message_type::text = 'creator_reply' then c.backer_id
      else null
    end
  into
    v_project_id,
    v_project_slug,
    v_project_title,
    v_recipient_id
  from public.support_conversations as c
  join public.projects as p
    on p.id = c.project_id
  where c.id = new.conversation_id;

  if not found or v_recipient_id is null then
    return new;
  end if;
    if v_recipient_id = new.sender_id then
    return new;
  end if;

  if new.message_type::text = 'support' then
    v_notification_type := 'support_message_received';
    v_href :=
      '/mypage/support-messages/' ||
      new.conversation_id::text;

  elsif new.message_type::text = 'creator_reply' then
    v_notification_type := 'support_message_replied';
    v_href :=
      '/mypage/support-messages/sent/' ||
      new.conversation_id::text;

  else
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    payload
  )
  values (
    v_recipient_id,
    v_notification_type,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'sender_id', new.sender_id,
      'project_id', v_project_id,
      'project_slug', v_project_slug,
      'project_title', v_project_title,
      'message_preview', left(new.body, 120),
      'href', v_href
    )
  );

  return new;
end;
$$;


drop trigger if exists
  trg_create_support_message_notification
on public.support_messages;


create trigger trg_create_support_message_notification
after insert
on public.support_messages
for each row
execute function public.create_support_message_notification();


revoke all
on function public.create_support_message_notification()
from public;