-- DreamFund
-- All or Nothing未達成時の安全な返金処理に必要なDB基盤
--
-- 方針:
-- 1. projects.status の failed は、決済確認前の暫定判定として扱う
-- 2. project_settlements で最終結果のロック状態を管理する
-- 3. 既存 refunds テーブルを、二重返金防止・再試行可能な構造へ拡張する
-- 4. 最終ロック済みプロジェクトは failed → succeeded の再判定対象から外す


-- ============================================================
-- 1. プロジェクトの終了・精算状態
-- ============================================================

create table if not exists public.project_settlements (
  id uuid primary key default uuid_generate_v4(),

  project_id uuid not null unique
    references public.projects(id)
    on delete restrict,

  status text not null default 'checking',

  final_status public.project_status,

  unresolved_payment_count integer not null default 0,

  locked_current_amount bigint,
  locked_supporters_count integer,

  last_checked_at timestamptz,
  next_check_at timestamptz,

  settlement_locked_at timestamptz,
  refund_eligible_at timestamptz,

  attempt_count integer not null default 0,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_settlements_status_check
    check (
      status in (
        'checking',
        'waiting_for_payments',
        'locked_succeeded',
        'locked_failed',
        'refunding',
        'completed',
        'manual_review'
      )
    ),

  constraint project_settlements_final_status_check
    check (
      final_status is null
      or final_status in (
        'succeeded'::public.project_status,
        'failed'::public.project_status
      )
    ),

  constraint project_settlements_unresolved_count_check
    check (unresolved_payment_count >= 0),

  constraint project_settlements_attempt_count_check
    check (attempt_count >= 0),

  constraint project_settlements_locked_amount_check
    check (
      locked_current_amount is null
      or locked_current_amount >= 0
    ),

  constraint project_settlements_locked_supporters_check
    check (
      locked_supporters_count is null
      or locked_supporters_count >= 0
    ),

  constraint project_settlements_lock_consistency_check
    check (
      (
        settlement_locked_at is null
        and final_status is null
      )
      or
      (
        settlement_locked_at is not null
        and final_status is not null
      )
    )
);

create index if not exists idx_project_settlements_status
on public.project_settlements(status);

create index if not exists idx_project_settlements_next_check
on public.project_settlements(next_check_at)
where next_check_at is not null;

comment on table public.project_settlements is
  '募集終了後の未確定決済確認、最終結果ロック、返金進行状況を管理する非公開テーブル。';

comment on column public.project_settlements.settlement_locked_at is
  'Stripe上の未確定決済を確認し、プロジェクトの成立・不成立を最終確定した日時。';

comment on column public.project_settlements.refund_eligible_at is
  'All or Nothing未達成プロジェクトについて、返金開始が可能になった日時。';


-- project_settlements はサーバー管理専用
alter table public.project_settlements
enable row level security;

revoke all
on table public.project_settlements
from public, anon, authenticated;


-- ============================================================
-- 2. 既存 refunds テーブルの安全性を強化
-- ============================================================

alter table public.refunds
add column if not exists project_id uuid;

alter table public.refunds
add column if not exists idempotency_key text;

alter table public.refunds
add column if not exists stripe_status text;

alter table public.refunds
add column if not exists attempt_count integer not null default 0;

alter table public.refunds
add column if not exists last_error text;

alter table public.refunds
add column if not exists next_retry_at timestamptz;

alter table public.refunds
add column if not exists approved_at timestamptz;

alter table public.refunds
add column if not exists processing_started_at timestamptz;

alter table public.refunds
add column if not exists succeeded_at timestamptz;

alter table public.refunds
add column if not exists manual_review_required boolean not null default false;

alter table public.refunds
add column if not exists manual_review_reason text;

alter table public.refunds
add column if not exists updated_at timestamptz not null default now();


-- 既存レコードがある環境でも補完できるようにする
update public.refunds r
set project_id = p.project_id
from public.pledges p
where p.id = r.pledge_id
  and r.project_id is null;

update public.refunds
set idempotency_key = 'dreamfund-refund-' || pledge_id::text
where idempotency_key is null;


alter table public.refunds
alter column project_id set not null;

alter table public.refunds
alter column idempotency_key set not null;


-- 外部キーを重複作成しない
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'refunds_project_id_fkey'
      and conrelid = 'public.refunds'::regclass
  ) then
    alter table public.refunds
    add constraint refunds_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete restrict;
  end if;
end;
$$;


-- 金額・試行回数の安全確認
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'refunds_amount_positive_check'
      and conrelid = 'public.refunds'::regclass
  ) then
    alter table public.refunds
    add constraint refunds_amount_positive_check
    check (amount > 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'refunds_attempt_count_check'
      and conrelid = 'public.refunds'::regclass
  ) then
    alter table public.refunds
    add constraint refunds_attempt_count_check
    check (attempt_count >= 0);
  end if;
end;
$$;


-- 1支援につき返金レコードは1件だけ
create unique index if not exists uq_refunds_pledge_id
on public.refunds(pledge_id);

-- 同じidempotency keyによる重複処理を防止
create unique index if not exists uq_refunds_idempotency_key
on public.refunds(idempotency_key);

-- 同じStripe Refundを複数レコードへ紐づけない
create unique index if not exists uq_refunds_stripe_refund_id
on public.refunds(stripe_refund_id)
where stripe_refund_id is not null;

create index if not exists idx_refunds_project_id
on public.refunds(project_id);

create index if not exists idx_refunds_status
on public.refunds(status);

create index if not exists idx_refunds_next_retry
on public.refunds(next_retry_at)
where next_retry_at is not null;


comment on column public.refunds.idempotency_key is
  'Stripe返金APIの重複実行を防ぐキー。dreamfund-refund-<pledgeId>形式。';

comment on column public.refunds.stripe_status is
  'Stripe Refundオブジェクト側の最新status。';

comment on column public.refunds.manual_review_required is
  '自動再試行を止め、運営による確認が必要な状態。';


-- refunds の作成・更新・削除はサーバー管理専用
-- 既存の支援者本人/admin向けSELECTポリシーは維持する
revoke insert, update, delete, truncate, references, trigger
on table public.refunds
from public, anon, authenticated;


-- ============================================================
-- 3. updated_at の自動更新
-- ============================================================

create or replace function public.touch_financial_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all
on function public.touch_financial_record_updated_at()
from public;


drop trigger if exists trg_touch_project_settlements
on public.project_settlements;

create trigger trg_touch_project_settlements
before update on public.project_settlements
for each row
execute function public.touch_financial_record_updated_at();


drop trigger if exists trg_touch_refunds
on public.refunds;

create trigger trg_touch_refunds
before update on public.refunds
for each row
execute function public.touch_financial_record_updated_at();


-- ============================================================
-- 4. 暫定終了判定関数を、最終ロック状態へ対応させる
-- ============================================================

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
      and not exists (
        select 1
        from public.project_settlements ps
        where ps.project_id = p.id
          and ps.settlement_locked_at is not null
      )
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
  '募集終了30分後に暫定結果を判定する。project_settlementsで最終ロック済みのプロジェクトは再判定しない。';

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