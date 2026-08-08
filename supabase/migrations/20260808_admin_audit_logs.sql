-- DreamFund
-- 管理者による重要操作を追跡する監査ログ
--
-- 方針:
-- 1. 管理画面から行われた重要操作を追記専用で記録する
-- 2. actor_user_id は監査証跡を保持するため外部キーを張らない
-- 3. 一般ユーザーからは完全に非公開
-- 4. service_role は SELECT / INSERT のみ許可し、UPDATE / DELETE は許可しない

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid not null,

  action text not null,
  target_type text not null,
  target_id text,

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_audit_logs_action_not_blank
    check (length(trim(action)) > 0),

  constraint admin_audit_logs_target_type_not_blank
    check (length(trim(target_type)) > 0),

  constraint admin_audit_logs_details_object_check
    check (jsonb_typeof(details) = 'object')
);

create index if not exists idx_admin_audit_logs_created_at
on public.admin_audit_logs(created_at desc);

create index if not exists idx_admin_audit_logs_actor
on public.admin_audit_logs(actor_user_id, created_at desc);

create index if not exists idx_admin_audit_logs_target
on public.admin_audit_logs(target_type, target_id, created_at desc);

create index if not exists idx_admin_audit_logs_action
on public.admin_audit_logs(action, created_at desc);


comment on table public.admin_audit_logs is
  '管理者による重要操作を追記専用で保存する非公開監査ログ。';

comment on column public.admin_audit_logs.actor_user_id is
  '操作を行った管理者のSupabase Auth user id。監査証跡保持のため外部キーは設定しない。';

comment on column public.admin_audit_logs.action is
  '実行した管理操作を表す安定した識別子。';

comment on column public.admin_audit_logs.target_type is
  '操作対象の種類。例: project_settlement, refund, project。';

comment on column public.admin_audit_logs.target_id is
  '操作対象のID。将来UUID以外の対象にも対応できるようtextで保持する。';

comment on column public.admin_audit_logs.details is
  '操作前後の状態や理由など、監査に必要な追加情報。機密情報や秘密鍵は保存しない。';


alter table public.admin_audit_logs
enable row level security;


revoke all
on table public.admin_audit_logs
from public, anon, authenticated;


grant select, insert
on table public.admin_audit_logs
to service_role;

revoke update, delete, truncate, references, trigger
on table public.admin_audit_logs
from service_role;
