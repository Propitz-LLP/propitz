-- Atomic transaction approval: status + ownership ledger + property counter +
-- reservation release all happen in one DB transaction, or none of them do.
-- Certificate generation and email stay outside (best-effort, retryable) —
-- see approveTransactionAction in src/features/transactions/actions.ts.

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

  return query select v_ownership_id;
end;
$$;

-- Certificates bucket, provisioned like kyc-documents/property-documents
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- Investors can read their own certificates via the documents table (existing
-- policy already covers select-own; add insert-none since only admin writes)
