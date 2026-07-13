-- paid支援の実数から、リターンの支援数を再計算する

create or replace function public.recalc_return_stock_sold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_return_id uuid;
  v_new_return_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_return_id := old.return_id;
  end if;

  if tg_op <> 'DELETE' then
    v_new_return_id := new.return_id;
  end if;

  if v_old_return_id is not null then
    update public.returns
    set stock_sold = (
      select count(*)::integer
      from public.pledges
      where return_id = v_old_return_id
        and status = 'paid'::public.pledge_status
    )
    where id = v_old_return_id;
  end if;

  if v_new_return_id is not null
     and v_new_return_id is distinct from v_old_return_id then
    update public.returns
    set stock_sold = (
      select count(*)::integer
      from public.pledges
      where return_id = v_new_return_id
        and status = 'paid'::public.pledge_status
    )
    where id = v_new_return_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all
on function public.recalc_return_stock_sold()
from public;


drop trigger if exists trg_recalc_return_stock_insert
on public.pledges;

drop trigger if exists trg_recalc_return_stock_delete
on public.pledges;

drop trigger if exists trg_recalc_return_stock_update
on public.pledges;


create trigger trg_recalc_return_stock_insert
after insert on public.pledges
for each row
when (
  new.status = 'paid'::public.pledge_status
  and new.return_id is not null
)
execute function public.recalc_return_stock_sold();


create trigger trg_recalc_return_stock_delete
after delete on public.pledges
for each row
when (
  old.status = 'paid'::public.pledge_status
  and old.return_id is not null
)
execute function public.recalc_return_stock_sold();


create trigger trg_recalc_return_stock_update
after update of status, return_id on public.pledges
for each row
when (
  (
    old.status = 'paid'::public.pledge_status
    and old.return_id is not null
  )
  or
  (
    new.status = 'paid'::public.pledge_status
    and new.return_id is not null
  )
)
execute function public.recalc_return_stock_sold();