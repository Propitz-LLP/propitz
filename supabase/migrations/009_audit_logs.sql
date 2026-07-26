-- Audit logging: an append-only trail of every privileged admin action
-- (KYC approve/reject, transaction approve/reject, property CRUD, distributions).
-- Satisfies plan tasks S3-11, S6-07, S11-01. Retention/archival (S11-02) is
-- forward-compatible via the isArchived flag; nothing deletes audit rows.
--
-- Write path: src/lib/audit (recordAudit) → src/lib/db/audit (insert/list).
-- Feature code never touches this table directly.
--
-- IMMUTABILITY NOTE: this app's admin flows use the service-role client
-- (createAdminClient), which BYPASSES RLS entirely — see CLAUDE.md "RLS trap".
-- So RLS policies below are defense-in-depth only; the real append-only
-- guarantee is the prevent_audit_mutation() trigger, which raises even for the
-- service role. Do not weaken it.

create table if not exists audit_logs (
  id            text primary key,
  "actorId"     uuid,                                   -- admin user id (null-safe: system/job actions)
  "actorEmail"  text not null,
  action        text not null,                          -- e.g. 'kyc.approve', 'transaction.reject'
  "entityType"  text not null,                          -- e.g. 'investor', 'transaction', 'property'
  "entityId"    text not null,
  before        jsonb,                                  -- snapshot before the change (null for creates)
  after         jsonb,                                  -- snapshot/summary after the change (null for deletes)
  ip            text,
  "isArchived"  boolean not null default false,         -- S11-02 retention: flag, never delete
  "createdAt"   timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx    on audit_logs ("entityType", "entityId");
create index if not exists audit_logs_actor_idx      on audit_logs ("actorId");
create index if not exists audit_logs_created_at_idx on audit_logs ("createdAt" desc);

-- Append-only: block every UPDATE and DELETE, including the service role.
create or replace function prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only (% not permitted)', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update on audit_logs;
create trigger audit_logs_no_update
  before update on audit_logs
  for each row execute function prevent_audit_mutation();

drop trigger if exists audit_logs_no_delete on audit_logs;
create trigger audit_logs_no_delete
  before delete on audit_logs
  for each row execute function prevent_audit_mutation();

-- RLS: mirrors the existing table style. Admin reads go through the service-role
-- client (bypasses these), but declaring them keeps the table consistent and
-- denies anon/investor access under the RLS-bound client.
alter table audit_logs enable row level security;
drop policy if exists "Admins have full access" on audit_logs;
create policy "Admins have full access" on audit_logs for all using (auth.jwt() ->> 'role' = 'admin');

-- ── Amend the two atomic RPCs to write their audit row INSIDE the transaction ──
-- For these, the audit insert is truly atomic with the mutation (the plan's
-- "same DB transaction" requirement). JS-orchestrated actions (KYC, property)
-- call recordAudit immediately after the mutation instead — see actions.ts.

create or replace function approve_transaction_atomic(p_transaction_id text, p_reviewed_by text)
returns table ("ownershipId" uuid) language plpgsql as $$
declare
  v_txn record;
  v_ownership_id uuid;
begin
  select * into v_txn from transactions where id = p_transaction_id for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;
  if v_txn.status != 'Admin Pending' then
    raise exception 'invalid_status: %', v_txn.status;
  end if;
  if v_txn."propertyId" is null or v_txn.units is null then
    raise exception 'invalid_transaction';
  end if;

  -- 1. Status → Completed
  update transactions set status = 'Completed' where id = p_transaction_id;
  insert into transaction_history (id, "transactionId", status, date, by)
  values (gen_random_uuid()::text, p_transaction_id, 'Completed', now()::date, p_reviewed_by);

  -- 2. Allocate units to the ownership ledger (upsert — grow an existing holding)
  insert into ownerships ("investorId", "propertyId", units, "acquiredPrice", "acquiredDate")
  values (v_txn."investorId", v_txn."propertyId", v_txn.units,
          (select "unitPrice" from properties where id = v_txn."propertyId"), now()::date)
  on conflict ("investorId", "propertyId")
  do update set units = ownerships.units + excluded.units
  returning id into v_ownership_id;

  -- 3. Permanently decrement available units on the property (row-guarded)
  update properties
  set "subscribedUnits" = "subscribedUnits" + v_txn.units, "updatedAt" = now()
  where id = v_txn."propertyId"
    and ("totalUnits" - "subscribedUnits") >= v_txn.units;

  if not found then
    raise exception 'insufficient_units';
  end if;

  -- 4. Release the reservation — now absorbed into subscribedUnits
  if v_txn."reservationId" is not null then
    update unit_reservations set status = 'released' where id = v_txn."reservationId";
  end if;

  -- 5. Audit trail (S6-07) — atomic with the allocation above. On any rollback
  -- earlier in this function, this row is rolled back too.
  insert into audit_logs (id, "actorId", "actorEmail", action, "entityType", "entityId", before, after)
  values (
    gen_random_uuid()::text, null, p_reviewed_by, 'transaction.approve', 'transaction', p_transaction_id,
    jsonb_build_object('status', v_txn.status),
    jsonb_build_object('status', 'Completed', 'ownershipId', v_ownership_id,
                       'investorId', v_txn."investorId", 'propertyId', v_txn."propertyId", 'units', v_txn.units)
  );

  return query select v_ownership_id;
end;
$$;

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

  -- Audit trail — atomic with the payout. entityId is the distribution summary row.
  insert into audit_logs (id, "actorId", "actorEmail", action, "entityType", "entityId", before, after)
  values (
    gen_random_uuid()::text, null, p_by, 'distribution.run', 'distribution', v_distribution_id::text,
    null,
    jsonb_build_object('propertyId', p_property_id, 'period', p_period, 'perUnit', p_per_unit,
                       'feePct', p_fee_pct, 'investorCount', v_investor_count,
                       'grossTotal', v_gross_total, 'netTotal', v_gross_total - v_fee_total)
  );

  return query select v_distribution_id, v_investor_count, v_gross_total, v_fee_total, v_gross_total - v_fee_total;
end;
$$;
