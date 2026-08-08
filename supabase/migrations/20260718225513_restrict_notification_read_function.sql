revoke execute
on function public.mark_notification_read(uuid)
from anon;

revoke execute
on function public.mark_notification_read(uuid)
from public;

grant execute
on function public.mark_notification_read(uuid)
to authenticated;