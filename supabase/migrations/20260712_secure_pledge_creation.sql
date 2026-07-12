-- DreamFund
-- 安全な支援データ作成と、決済成功時だけ集計する仕組み

-- ブラウザから pledges へ直接 INSERT できなくする
drop policy if exists "支援は本人が作成"
on public.pledges;

revoke insert
on table public.pledges
from anon, authenticated;


-- 検証済みの pending 支援だけを作成する
create or replace function public.create_pending_pledge(
  p_project_slug text,
  p_return_id uuid
)
returns table (
  pledge_id uuid,
  amount bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_project public.projects%rowtype;
  v_return public.returns%rowtype;
  v_pledge_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  select *
  into v_project
  from public.projects
  where slug = p_project_slug;

  if not found then
    raise exception 'プロジェクトが見つかりません';
  end if;

  if v_project.status <> 'live'::public.project_status then
    raise exception '現在支援できないプロジェクトです';
  end if;

  if v_project.owner_id = v_user_id then
    raise exception '自分のプロジェクトには支援できません';
  end if;

  if v_project.start_at is not null
     and v_project.start_at > now() then
    raise exception 'このプロジェクトはまだ開始していません';
  end if;

  if v_project.end_at is not null
     and v_project.end_at <= now() then
    raise exception 'このプロジェクトの支援期間は終了しました';
  end if;

  select *
  into v_return
  from public.returns
  where id = p_return_id
    and project_id = v_project.id;

  if not found then
    raise exception '選択されたリターンが見つかりません';
  end if;

  if v_return.stock_total is not null
     and v_return.stock_sold >= v_return.stock_total then
    raise exception 'このリターンは売り切れています';
  end if;

  insert into public.pledges (
    project_id,
    backer_id,
    return_id,
    amount,
    fee_amount,
    status
  )
  values (
    v_project.id,
    v_user_id,
    v_return.id,
    v_return.price,
    0,
    'pending'::public.pledge_status
  )
  returning id into v_pledge_id;

  return query
  select v_pledge_id, v_return.price;
end;
$$;

revoke all
on function public.create_pending_pledge(text, uuid)
from public;

grant execute
on function public.create_pending_pledge(text, uuid)
to authenticated;


-- 集計関数から public スキーマを安全に参照できるようにする
alter function public.recalc_project_totals()
set search_path = public, pg_temp;


-- 古い「すべての変更で動く」集計トリガーを削除
drop trigger if exists trg_recalc_totals
on public.pledges;

drop trigger if exists trg_recalc_totals_insert
on public.pledges;

drop trigger if exists trg_recalc_totals_delete
on public.pledges;

drop trigger if exists trg_recalc_totals_update
on public.pledges;


-- paid の支援が追加された時だけ再集計
create trigger trg_recalc_totals_insert
after insert on public.pledges
for each row
when (new.status = 'paid'::public.pledge_status)
execute function public.recalc_project_totals();


-- paid の支援が削除された時だけ再集計
create trigger trg_recalc_totals_delete
after delete on public.pledges
for each row
when (old.status = 'paid'::public.pledge_status)
execute function public.recalc_project_totals();


-- paid への変更・paid からの変更時だけ再集計
create trigger trg_recalc_totals_update
after update of status, amount, project_id on public.pledges
for each row
when (
  old.status = 'paid'::public.pledge_status
  or new.status = 'paid'::public.pledge_status
)
execute function public.recalc_project_totals();