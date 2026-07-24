-- Admin distributions: pay rental income to every unit-holder of a property,
-- split pro-rata by units held, minus a distribution fee. The summary row and
-- every per-investor Distribution transaction are written in one DB transaction
-- (distribute_atomic RPC) — either all land or none do. Emails are sent outside
-- the transaction as best-effort follow-ups (see confirmDistributionAction).

-- Idempotency guard: one distribution per (property, period). A retry, double
-- submit, or duplicate request cannot double-pay.
create unique index if not exists distributions_property_period_uniq
  on distributions ("propertyId", period);

create or replace function distribute_atomic(
  p_property_id uuid,
  p_period text,
  p_per_unit numeric,
  p_fee_pct numeric,
  p_date date,
  p_by text
) returns table (
  "distributionId" uuid,
  "investorCount" integer,
  "grossTotal" numeric,
  "feeTotal" numeric,
  "netTotal" numeric
) language plpgsql as $$
declare
  v_property record;
  v_owner record;
  v_distribution_id uuid;
  v_txn_id text;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  v_investor_count integer := 0;
  v_gross_total numeric := 0;
  v_fee_total numeric := 0;
begin
  -- Lock the property row so a concurrent run for the same property serialises.
  select * into v_property from properties where id = p_property_id for update;
  if not found then
    raise exception 'property_not_found';
  end if;
  if v_property.status not in ('Open', 'Fully Subscribed') then
    raise exception 'property_not_open: %', v_property.status;
  end if;

  -- Idempotency: refuse a second distribution for the same period. The unique
  -- index enforces this too; the explicit check gives a clean error code.
  if exists (
    select 1 from distributions
    where "propertyId" = p_property_id and period = p_period
  ) then
    raise exception 'already_distributed';
  end if;

  -- One Distribution transaction per holder. Deterministic id (DIST-{period}-
  -- {investorId}) so a bypass of the guard still collides on the PK.
  for v_owner in
    select "investorId", units from ownerships
    where "propertyId" = p_property_id and units > 0
  loop
    v_gross := round(v_owner.units * p_per_unit, 2);
    v_fee   := round(v_gross * p_fee_pct / 100, 2);
    v_net   := v_gross - v_fee;
    v_txn_id := 'DIST-' || replace(p_period, ' ', '') || '-' || v_owner."investorId"::text;

    insert into transactions
      (id, "investorId", "propertyId", type, units, gross, fee, net, status, "razorpayId", date, period, notes)
    values
      (v_txn_id, v_owner."investorId", p_property_id, 'Distribution', null,
       v_gross, v_fee, v_net, 'Completed', null, p_date, p_period,
       p_period || ' rental distribution — ' || v_property.name);

    insert into transaction_history (id, "transactionId", status, date, by)
    values (gen_random_uuid()::text, v_txn_id, 'Completed', p_date, p_by);

    v_investor_count := v_investor_count + 1;
    v_gross_total := v_gross_total + v_gross;
    v_fee_total := v_fee_total + v_fee;
  end loop;

  -- Summary row.
  insert into distributions
    ("propertyId", period, "perUnit", "feePct", "grossTotal", "feeTotal", "netTotal", "investorCount", date, status)
  values
    (p_property_id, p_period, p_per_unit, p_fee_pct, v_gross_total, v_fee_total,
     v_gross_total - v_fee_total, v_investor_count, p_date, 'Completed')
  returning id into v_distribution_id;

  return query select v_distribution_id, v_investor_count, v_gross_total, v_fee_total, v_gross_total - v_fee_total;
end;
$$;
