-- Valuation update (S8-06 / S8-07): an admin revalues a property's unit price.
-- The new price, the valuation_history row, and the audit entry are written in
-- one DB transaction (record_valuation_atomic) — either all land or none do.
--
-- Cascade note: portfolio current-value is computed LIVE from properties.unitPrice
-- (see getPortfolio in src/lib/db/ownerships.ts), never denormalised per-investor.
-- So updating the price here IS the cascade — every holder's dashboard reflects
-- the new value on next load. The only follow-up is notifying holders, done
-- best-effort outside this transaction in updateValuationAction.

create or replace function record_valuation_atomic(
  p_property_id uuid,
  p_new_price   numeric,
  p_quarter     text,
  p_by          text
) returns table ("valuationId" uuid, "previousPrice" numeric) language plpgsql as $$
declare
  v_property record;
  v_valuation_id uuid;
begin
  -- Lock the property row so concurrent revaluations serialise.
  select * into v_property from properties where id = p_property_id for update;
  if not found then
    raise exception 'property_not_found';
  end if;
  if p_new_price is null or p_new_price <= 0 then
    raise exception 'invalid_price';
  end if;

  -- 1. New valuation_history row — old rows are never overwritten (FR-09.2).
  insert into valuation_history (id, "propertyId", "unitPrice", quarter, "recordedAt")
  values (gen_random_uuid(), p_property_id, p_new_price, p_quarter, now())
  returning id into v_valuation_id;

  -- 2. Point the property at the new current price.
  update properties
  set "unitPrice" = p_new_price, "updatedAt" = now()
  where id = p_property_id;

  -- 3. Audit trail (S3-11 pattern) — atomic with the price change.
  insert into audit_logs (id, "actorId", "actorEmail", action, "entityType", "entityId", before, after)
  values (
    gen_random_uuid()::text, null, p_by, 'property.revalue', 'property', p_property_id::text,
    jsonb_build_object('unitPrice', v_property."unitPrice"),
    jsonb_build_object('unitPrice', p_new_price, 'quarter', p_quarter)
  );

  return query select v_valuation_id, v_property."unitPrice";
end;
$$;
