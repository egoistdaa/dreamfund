-- DreamFund late PaymentIntent success handling
--
-- A delayed payment_intent.succeeded event must not:
-- 1. Restore a pledge that was already refunded
-- 2. Leave a paid pledge without a refund after a failed settlement
-- 3. Silently change the amount after a succeeded settlement was locked
--
-- Only service_role can execute this function.


create or replace function public.apply_payment_intent_succeeded(
  p_pledge_id uuid,
  p_stripe_payment_intent_id text
)
returns table (
  pledge_id uuid,
  pledge_status public.pledge_status,
  settlement_status text,
  refund_id uuid,
  action text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pledge public.pledges%rowtype;
  v_settlement public.project_settlements%rowtype;
  v_refund public.refunds%rowtype;

  v_became_paid boolean := false;
  v_action text;
begin
  if p_pledge_id is null then
    raise exception 'Pledge ID is required';
  end if;

  if p_stripe_payment_intent_id is null
    or btrim(p_stripe_payment_intent_id) = ''
  then
    raise exception 'Stripe PaymentIntent ID is required';
  end if;


  -- Match the lock order used by the refund processor:
  -- refunds -> pledges -> project_settlements.
  select r.*
  into v_refund
  from public.refunds r
  where r.pledge_id = p_pledge_id
  for update;


  select p.*
  into v_pledge
  from public.pledges p
  where p.id = p_pledge_id
  for update;

  if not found then
    raise exception 'Pledge record was not found';
  end if;


  if v_pledge.stripe_payment_intent_id is null
    or v_pledge.stripe_payment_intent_id
      <> p_stripe_payment_intent_id
  then
    raise exception
      'Stripe PaymentIntent ID does not match the pledge';
  end if;


  -- A retried old success event must never restore an already
  -- refunded pledge to paid.
  if v_pledge.status =
    'refunded'::public.pledge_status
  then
    select ps.*
    into v_settlement
    from public.project_settlements ps
    where ps.project_id = v_pledge.project_id;

    return query
    select
      v_pledge.id,
      v_pledge.status,
      v_settlement.status,
      v_refund.id,
      'already_refunded'::text;

    return;
  end if;


  if v_pledge.status in (
    'pending'::public.pledge_status,
    'failed'::public.pledge_status
  ) then
    update public.pledges p
    set
      status = 'paid'::public.pledge_status,
      updated_at = now()
    where p.id = v_pledge.id
    returning *
    into v_pledge;

    v_became_paid := true;

  elsif v_pledge.status =
    'paid'::public.pledge_status
  then
    v_became_paid := false;

  else
    raise exception
      'Unsupported pledge status: %',
      v_pledge.status;
  end if;


  select ps.*
  into v_settlement
  from public.project_settlements ps
  where ps.project_id = v_pledge.project_id
  for update;


  -- The project has not been financially locked yet.
  if not found
    or v_settlement.settlement_locked_at is null
  then
    v_action :=
      case
        when v_became_paid
          then 'payment_recorded'
        else 'already_recorded'
      end;

    return query
    select
      v_pledge.id,
      v_pledge.status,
      v_settlement.status,
      v_refund.id,
      v_action;

    return;
  end if;


  -- A late success after a failed All or Nothing settlement
  -- must always have exactly one refund record.
  if v_settlement.final_status =
    'failed'::public.project_status
  then
    insert into public.refunds (
      pledge_id,
      project_id,
      reason,
      amount,
      status,
      idempotency_key,
      approved_at
    )
    values (
      v_pledge.id,
      v_pledge.project_id,
      'Late successful payment after failed project settlement',
      v_pledge.amount,
      'approved'::public.refund_status,
      'dreamfund-refund-' || v_pledge.id::text,
      now()
    )
    on conflict (pledge_id)
    do update
    set
      project_id = excluded.project_id,
      amount = excluded.amount,
      reason = coalesce(
        public.refunds.reason,
        excluded.reason
      ),
      status =
        case
          when public.refunds.status =
            'requested'::public.refund_status
            then 'approved'::public.refund_status
          else public.refunds.status
        end,
      approved_at =
        case
          when public.refunds.status =
            'requested'::public.refund_status
            then coalesce(
              public.refunds.approved_at,
              excluded.approved_at
            )
          else public.refunds.approved_at
        end
    returning *
    into v_refund;


    if v_refund.status in (
      'done'::public.refund_status,
      'rejected'::public.refund_status
    )
      or v_refund.manual_review_required
    then
      update public.project_settlements ps
      set
        status = 'manual_review',
        last_checked_at = now(),
        next_check_at = null,
        last_error =
          'Late succeeded payment has a terminal refund record: '
          || v_refund.id::text
      where ps.project_id = v_pledge.project_id
      returning *
      into v_settlement;

      v_action := 'manual_review';

    else
      update public.project_settlements ps
      set
        status =
          case
            when ps.status = 'manual_review'
              then 'manual_review'
            when v_refund.status =
              'processing'::public.refund_status
              then 'refunding'
            when ps.status = 'refunding'
              then 'refunding'
            else 'locked_failed'
          end,
        refund_eligible_at = coalesce(
          ps.refund_eligible_at,
          now()
        ),
        last_checked_at = now(),
        next_check_at =
          case
            when ps.status = 'manual_review'
              then ps.next_check_at
            else null
          end,
        last_error =
          case
            when ps.status = 'manual_review'
              then ps.last_error
            else null
          end
      where ps.project_id = v_pledge.project_id
      returning *
      into v_settlement;

      v_action :=
        case
          when v_settlement.status = 'manual_review'
            then 'manual_review'
          else 'refund_queued'
        end;
    end if;


    return query
    select
      v_pledge.id,
      v_pledge.status,
      v_settlement.status,
      v_refund.id,
      v_action;

    return;
  end if;


  -- If the successful settlement was already locked and this
  -- event newly changed the pledge to paid, the locked financial
  -- totals may no longer match. Stop automatic processing.
  if v_settlement.final_status =
    'succeeded'::public.project_status
    and v_became_paid
  then
    update public.project_settlements ps
    set
      status = 'manual_review',
      last_checked_at = now(),
      next_check_at = null,
      last_error =
        'Payment succeeded after successful settlement lock: '
        || v_pledge.id::text
    where ps.project_id = v_pledge.project_id
    returning *
    into v_settlement;

    v_action := 'manual_review';
  else
    v_action := 'already_recorded';
  end if;


  return query
  select
    v_pledge.id,
    v_pledge.status,
    v_settlement.status,
    v_refund.id,
    v_action;
end;
$$;


comment on function public.apply_payment_intent_succeeded(
  uuid,
  text
) is
  'Atomically records PaymentIntent success and queues a refund when the project settlement was already locked as failed.';


revoke all
on function public.apply_payment_intent_succeeded(
  uuid,
  text
)
from public, anon, authenticated;


grant execute
on function public.apply_payment_intent_succeeded(
  uuid,
  text
)
to service_role;