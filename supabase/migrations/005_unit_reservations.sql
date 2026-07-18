-- Sprint 4: unit reservations (15-min holds) + payment-method columns on transactions

create table if not exists unit_reservations (
  id            uuid primary key default gen_random_uuid(),
  "propertyId"  uuid not null references properties(id) on delete cascade,
  "investorId"  uuid not null references investors(id) on delete cascade,
  units         integer not null check (units > 0),
  status        text not null default 'active', -- active | consumed | released | expired
  "expiresAt"   timestamptz not null,
  "createdAt"   timestamptz not null default now()
);

create index if not exists unit_reservations_active_idx
  on unit_reservations ("propertyId") where status in ('active', 'consumed');

alter table unit_reservations enable row level security;
create policy "Investors can read own reservations" on unit_reservations
  for select using (auth.uid() = "investorId");
create policy "Admins have full access" on unit_reservations
  for all using (auth.jwt() ->> 'role' = 'admin');

-- Atomic hold. Sweeps expired holds lazily, then fails if the requested units
-- exceed what's left after subtracting sold units and live holds.
-- 'consumed' holds (cash transaction pending) still count against availability.
create or replace function reserve_units_atomic(
  p_property_id uuid,
  p_investor_id uuid,
  p_units integer,
  p_ttl_seconds integer
) returns uuid language plpgsql as $$
declare
  v_reservation_id uuid;
  v_available integer;
begin
  update unit_reservations set status = 'expired'
  where "propertyId" = p_property_id and status = 'active' and "expiresAt" < now();

  select ("totalUnits" - "subscribedUnits") - coalesce((
    select sum(units) from unit_reservations
    where "propertyId" = p_property_id and status in ('active', 'consumed')
  ), 0)
  into v_available
  from properties where id = p_property_id
  for update; -- lock the property row so concurrent reservations serialise

  if v_available is null or v_available < p_units then
    raise exception 'insufficient_units';
  end if;

  insert into unit_reservations ("propertyId", "investorId", units, "expiresAt")
  values (p_property_id, p_investor_id, p_units, now() + (p_ttl_seconds || ' seconds')::interval)
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

-- Payment-method layer: how a transaction was (or will be) paid
alter table transactions
  add column if not exists "paymentMethod" text not null default 'cash',
  add column if not exists "paymentRef" text,
  add column if not exists "reservationId" uuid references unit_reservations(id);
