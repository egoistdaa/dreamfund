-- ============================================================
--  DreamFund  Supabase スキーマ  (PostgreSQL)
--  実行可能なSQL。Supabase の SQL Editor に貼って実行できます。
--  設計思想: MVPで使わないテーブルも最初から定義し、作り直しを防ぐ。
-- ============================================================

-- 拡張機能（UUID生成などに使用）
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
--  1. ENUM（取り得る値を固定する型）
--  なぜ: status を文字列で自由入力にすると打ち間違いでバグになる。
--       決められた値しか入らないようにDBレベルで守る。
-- ============================================================
create type user_role        as enum ('user', 'creator', 'reviewer', 'admin');
create type kyc_status        as enum ('none', 'pending', 'verified', 'rejected');
create type project_status    as enum ('draft', 'under_review', 'rejected', 'live', 'succeeded', 'failed', 'closed');
create type pledge_status     as enum ('pending', 'paid', 'refunded', 'failed');
create type payout_status     as enum ('scheduled', 'processing', 'paid', 'failed');
create type refund_status     as enum ('requested', 'approved', 'processing', 'done', 'rejected');
create type review_action     as enum ('submitted', 'approved', 'rejected', 'flagged');
create type report_status     as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type funding_type      as enum ('all_or_nothing', 'all_in'); -- 達成時のみ成立 / 未達でも成立

-- ============================================================
--  2. ユーザー情報（公開/非公開/決済の3テーブルに分割）
--  Supabase Auth の auth.users と 1対1 で紐づく。
--
--  ★重要な設計判断: ユーザー情報を「機微度」で3テーブルに分割する。
--  なぜ: RLSは「行(どのユーザーか)」は守れるが「列(どのカラムか)」は
--        守れない。1つのテーブルに公開情報と決済情報を混ぜると、
--        公開閲覧を許した瞬間、機微カラムも本人には見えてしまう。
--        API側のselect制限は「お行儀」であって「鍵」ではない。
--        → テーブル自体を分け、機微情報には本人/adminしかアクセス
--          できないRLSを張る。DB構造そのものを安全側に倒す。
--
--   public_profiles  … 誰に見せてもよい情報のみ（公開閲覧OK）
--   profiles_private … role / kyc_status など本人・adminのみ
--   creator_accounts … stripe_*** 決済アカウント。本人・adminのみ
-- ============================================================

-- (a) 公開プロフィール: 他人に見せてよい情報だけ
create table public_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '名称未設定',
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- (b) 非公開プロフィール: 権限・本人確認状態など。本人/adminのみ。
create table profiles_private (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role  not null default 'user',
  kyc_status    kyc_status not null default 'none',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- (c) 決済アカウント: Stripe ID群。最も機微。本人/adminのみ。
--     起案者(振込先)と支援者(決済顧客)の両方をここに集約。
create table creator_accounts (
  id                 uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id  text,   -- 起案者の振込先(Stripe Connect)
  stripe_customer_id text,   -- 支援者の決済顧客ID
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
--  3. projects（プロジェクト）
-- ============================================================
create table projects (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references public_profiles(id) on delete cascade,
  title             text not null,
  slug              text unique not null,
  category          text not null,
  tags              text[] default '{}',
  thumbnail_url     text,
  gallery           text[] default '{}',
  story             text,
  goal_amount       bigint not null check (goal_amount > 0),  -- 目標金額(円)
  current_amount    bigint not null default 0,                -- 集計で自動更新
  supporters_count  int    not null default 0,                -- 集計で自動更新
  funding_type      funding_type not null default 'all_or_nothing',
  status            project_status not null default 'draft',
  review_note       text,                                     -- 差し戻し理由など
  start_at          timestamptz,
  end_at            timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_projects_status   on projects(status);
create index idx_projects_category on projects(category);
create index idx_projects_owner    on projects(owner_id);

-- ============================================================
--  4. returns（リターン / 支援コース）
-- ============================================================
create table returns (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  title             text not null,
  description       text,
  price             bigint not null check (price > 0),
  stock_total       int,                       -- null=無制限, 数値=限定100個 等
  stock_sold        int not null default 0,    -- 在庫管理
  estimated_delivery text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index idx_returns_project on returns(project_id);

-- ============================================================
--  5. pledges（支援）  ← お金の中心
-- ============================================================
create table pledges (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete restrict,
  backer_id         uuid not null references public_profiles(id) on delete restrict,
  return_id         uuid references returns(id) on delete set null,
  amount            bigint not null check (amount > 0),
  fee_amount        bigint not null default 0,  -- 手数料(計算結果を記録)
  status            pledge_status not null default 'pending',
  stripe_payment_intent_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_pledges_project on pledges(project_id);
create index idx_pledges_backer  on pledges(backer_id);
create index idx_pledges_status  on pledges(status);

-- ============================================================
--  6. payouts（振込: 起案者への送金）
-- ============================================================
create table payouts (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete restrict,
  owner_id          uuid not null references public_profiles(id) on delete restrict,
  gross_amount      bigint not null,   -- 総支援額
  fee_total         bigint not null,   -- 手数料合計
  net_amount        bigint not null,   -- 振込額 = gross - fee
  status            payout_status not null default 'scheduled',
  stripe_transfer_id text,
  scheduled_at      timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_payouts_owner on payouts(owner_id);

-- ============================================================
--  7. refunds（返金）
-- ============================================================
create table refunds (
  id                uuid primary key default uuid_generate_v4(),
  pledge_id         uuid not null references pledges(id) on delete restrict,
  reason            text,
  amount            bigint not null,
  status            refund_status not null default 'requested',
  stripe_refund_id  text,
  processed_by      uuid references public_profiles(id),
  created_at        timestamptz not null default now()
);

-- ============================================================
--  8. reviews（審査ログ: 監査証跡）
--  なぜ: 誰がいつ承認/差し戻したかを残す。トラブル時の証拠になる。
-- ============================================================
create table reviews (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  reviewer_id       uuid references public_profiles(id),
  action            review_action not null,
  note              text,
  created_at        timestamptz not null default now()
);
create index idx_reviews_project on reviews(project_id);

-- ============================================================
--  9. reports（通報）
-- ============================================================
create table reports (
  id                uuid primary key default uuid_generate_v4(),
  target_type       text not null,   -- 'project' | 'comment' | 'user'
  target_id         uuid not null,
  reporter_id       uuid references public_profiles(id),
  reason            text not null,
  status            report_status not null default 'open',
  created_at        timestamptz not null default now()
);

-- ============================================================
--  10. 補助テーブル群
-- ============================================================
create table comments (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  author_id   uuid not null references public_profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index idx_comments_project on comments(project_id);

create table favorites (
  user_id     uuid not null references public_profiles(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, project_id)   -- 同じものを2回お気に入りできない
);

create table project_updates (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  body        text,
  created_at  timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public_profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- 手数料率などを画面から変えられるよう設定をDBに持つ
create table platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into platform_settings(key, value) values
  ('fee', '{"platform_rate": 0.10, "payment_rate": 0.036}');

-- ============================================================
--  11. トリガー: 支援が paid になったら集計を自動更新
--  なぜ: 閲覧のたびに合計を計算すると重い。支援時に一度だけ更新する。
-- ============================================================
create or replace function recalc_project_totals()
returns trigger language plpgsql as $$
begin
  update projects p set
    current_amount   = coalesce((select sum(amount) from pledges
                                 where project_id = p.id and status = 'paid'), 0),
    supporters_count = coalesce((select count(distinct backer_id) from pledges
                                 where project_id = p.id and status = 'paid'), 0),
    updated_at = now()
  where p.id = coalesce(new.project_id, old.project_id);
  return null;
end; $$;

create trigger trg_recalc_totals
after insert or update or delete on pledges
for each row execute function recalc_project_totals();

-- updated_at 自動更新
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_touch_projects before update on projects
  for each row execute function touch_updated_at();

-- 新規サインアップ時に3つのプロフィール行を自動作成。
-- なぜ: テーブルを分けたので、登録時に3つを必ず揃えないと
--       「公開はあるが権限行が無い」といった不整合が起きる。
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public_profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '名称未設定'));
  insert into profiles_private (id) values (new.id);
  insert into creator_accounts (id) values (new.id);
  return new;
end; $$;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
--  12. RLS（Row Level Security / 行単位の権限）
--  なぜ最重要: APIにバグがあっても、DB自身が「見せていい行」だけ返す。
--             他人の決済情報が漏れない最後の砦。
-- ============================================================

-- 全テーブルでRLSを有効化（有効にすると、許可した操作以外は全拒否）
alter table public_profiles  enable row level security;
alter table profiles_private enable row level security;
alter table creator_accounts enable row level security;
alter table projects        enable row level security;
alter table returns         enable row level security;
alter table pledges         enable row level security;
alter table payouts         enable row level security;
alter table refunds         enable row level security;
alter table reviews         enable row level security;
alter table reports         enable row level security;
alter table comments        enable row level security;
alter table favorites       enable row level security;
alter table project_updates enable row level security;
alter table notifications   enable row level security;

-- 補助関数: 今ログインしているユーザーが admin か？
-- security definer: 関数の所有者権限で動き、profiles_private のRLSに
--   邪魔されず role を読める（RLSの自己参照ループも防ぐ）。
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles_private
    where id = auth.uid() and role = 'admin');
$$;
-- 補助関数: reviewer 以上か？
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles_private
    where id = auth.uid() and role in ('reviewer','admin'));
$$;

-- --- public_profiles --- 公開情報なので誰でも閲覧OK。更新は本人のみ。
create policy "公開プロフィールは誰でも閲覧" on public_profiles
  for select using (true);
create policy "公開プロフィールは本人が更新" on public_profiles
  for update using (id = auth.uid());
create policy "公開プロフィールは本人が作成" on public_profiles
  for insert with check (id = auth.uid());

-- --- profiles_private --- ★本人とadminのみ。role/kyc_statusを守る。
create policy "非公開情報は本人とadminのみ閲覧" on profiles_private
  for select using (id = auth.uid() or is_admin());
-- role の変更は admin だけ（本人が自分をadminに昇格できないように）。
-- kyc_status はサーバー(service role)が更新するため通常クライアントは触らない。
create policy "権限変更はadminのみ" on profiles_private
  for update using (is_admin());

-- --- creator_accounts --- ★最も機微。Stripe ID。本人とadminのみ。
create policy "決済アカウントは本人とadminのみ閲覧" on creator_accounts
  for select using (id = auth.uid() or is_admin());
-- 作成・更新は基本サーバー側(service role)で行うが、本人も自レコードは可。
create policy "決済アカウントは本人が作成" on creator_accounts
  for insert with check (id = auth.uid());
create policy "決済アカウントは本人が更新" on creator_accounts
  for update using (id = auth.uid() or is_admin());

-- --- projects ---
-- 公開中(live等)は誰でも閲覧。下書きは本人とスタッフのみ。
create policy "公開プロジェクトは誰でも閲覧" on projects
  for select using (
    status in ('live','succeeded','failed','closed')
    or owner_id = auth.uid() or is_staff()
  );
create policy "creatorは自分のプロジェクトを作成" on projects
  for insert with check (owner_id = auth.uid());
create policy "本人かスタッフだけ更新" on projects
  for update using (owner_id = auth.uid() or is_staff());

-- --- returns --- 公開プロジェクトのリターンは誰でも閲覧
create policy "リターンは公開閲覧" on returns
  for select using (true);
create policy "プロジェクト所有者がリターン管理" on returns
  for all using (
    exists(select 1 from projects p
           where p.id = project_id and (p.owner_id = auth.uid() or is_staff()))
  );

-- --- pledges --- ★最重要: 本人/起案者/adminのみ
create policy "支援は本人・対象起案者・adminだけ閲覧" on pledges
  for select using (
    backer_id = auth.uid()
    or exists(select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
    or is_admin()
  );
create policy "支援は本人が作成" on pledges
  for insert with check (backer_id = auth.uid());

-- --- payouts --- 起案者本人とadminのみ
create policy "振込は本人とadminのみ" on payouts
  for select using (owner_id = auth.uid() or is_admin());

-- --- refunds --- 関係者とadmin
create policy "返金は関係者とadmin" on refunds
  for select using (
    exists(select 1 from pledges pl where pl.id = pledge_id and pl.backer_id = auth.uid())
    or is_admin()
  );

-- --- reviews / reports --- スタッフのみ閲覧
create policy "審査ログはスタッフのみ" on reviews
  for select using (is_staff());
create policy "通報はスタッフ閲覧・誰でも作成" on reports
  for select using (is_staff());
create policy "通報は誰でも作成" on reports
  for insert with check (reporter_id = auth.uid());

-- --- comments --- 公開閲覧・本人作成
create policy "コメントは公開閲覧" on comments for select using (true);
create policy "コメントは本人が作成"  on comments for insert with check (author_id = auth.uid());
create policy "コメントは本人が削除"  on comments for delete using (author_id = auth.uid() or is_staff());

-- --- favorites / notifications --- 本人のみ
create policy "お気に入りは本人のみ" on favorites for all using (user_id = auth.uid());
create policy "通知は本人のみ"       on notifications for select using (user_id = auth.uid());

-- --- project_updates --- 公開閲覧・所有者作成
create policy "活動報告は公開閲覧" on project_updates for select using (true);
create policy "活動報告は所有者作成" on project_updates for all using (
  exists(select 1 from projects p where p.id = project_id and (p.owner_id = auth.uid() or is_staff()))
);

-- ============================================================
--  完了。MVPでは多くのテーブルが空のまま使われませんが、
--  スキーマとRLSは本番と同一。機能追加時に作り直し不要。
-- ============================================================
