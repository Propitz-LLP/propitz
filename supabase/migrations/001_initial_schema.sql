-- Propitz initial schema
-- Run: supabase db push

-- ── INVESTORS ────────────────────────────────────────────────
create table investors (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  phone         text,
  type          text not null default 'Individual - Resident Indian',
  "kycStatus"   text not null default 'Not Started',
  initials      text not null default '',
  "createdAt"   timestamptz not null default now()
);

alter table investors enable row level security;
create policy "Investors can read own record"    on investors for select using (auth.uid() = id);
create policy "Investors can update own record"  on investors for update using (auth.uid() = id);
create policy "Admins have full access"          on investors for all using (auth.jwt() ->> 'role' = 'admin');

-- ── KYC SUBMISSIONS ──────────────────────────────────────────
create table kyc_submissions (
  id                uuid primary key default gen_random_uuid(),
  "investorId"      uuid not null references investors(id) on delete cascade,
  pan               text not null,
  "aadhaarMasked"   text not null,
  "bankAccount"     text not null,
  "bankName"        text not null,
  "submittedAt"     timestamptz not null default now(),
  "reviewedBy"      text,
  "reviewedAt"      timestamptz,
  notes             text
);

alter table kyc_submissions enable row level security;
create policy "Investors can read own submission"   on kyc_submissions for select using (auth.uid() = "investorId");
create policy "Investors can insert own submission" on kyc_submissions for insert with check (auth.uid() = "investorId");
create policy "Admins have full access"             on kyc_submissions for all using (auth.jwt() ->> 'role' = 'admin');

-- ── KYC DOCUMENTS ────────────────────────────────────────────
create table kyc_documents (
  id              uuid primary key default gen_random_uuid(),
  "submissionId"  uuid not null references kyc_submissions(id) on delete cascade,
  type            text not null,
  "storagePath"   text not null,
  "sizeBytes"     integer not null default 0,
  "uploadedAt"    timestamptz not null default now()
);

alter table kyc_documents enable row level security;
create policy "Admins have full access" on kyc_documents for all using (auth.jwt() ->> 'role' = 'admin');

-- ── PROPERTIES ───────────────────────────────────────────────
create table properties (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  city                  text not null,
  district              text not null,
  state                 text not null,
  "pinCode"             text,
  "assetType"           text not null,
  description           text not null default '',
  "totalValuation"      numeric(15,2) not null,
  "totalUnits"          integer not null,
  "subscribedUnits"     integer not null default 0,
  "unitPrice"           numeric(12,2) not null,
  "rentalYieldPct"      numeric(5,2) not null default 0,
  "capitalGrowthPct"    numeric(5,2) not null default 0,
  "holdingPeriod"       text not null default '5-7 years',
  "lockInPeriod"        text not null default '3 years',
  "minInvestmentUnits"  integer not null default 1,
  status                text not null default 'Draft',
  "coverEmoji"          text not null default '🏢',
  "coverGradient"       text not null default 'linear-gradient(135deg,#1B3057,#2A4A7A)',
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now()
);

alter table properties enable row level security;
create policy "Anyone authenticated can view Open properties"
  on properties for select using (auth.role() = 'authenticated' and status = 'Open');
create policy "Admins have full access" on properties for all using (auth.jwt() ->> 'role' = 'admin');

-- Atomic unit reservation to prevent race conditions
create or replace function reserve_property_units(p_property_id uuid, p_units integer)
returns void language plpgsql as $$
begin
  update properties
  set "subscribedUnits" = "subscribedUnits" + p_units,
      "updatedAt" = now()
  where id = p_property_id
    and ("totalUnits" - "subscribedUnits") >= p_units;

  if not found then
    raise exception 'Not enough units available for property %', p_property_id;
  end if;
end;
$$;

-- ── VALUATION HISTORY ────────────────────────────────────────
create table valuation_history (
  id            uuid primary key default gen_random_uuid(),
  "propertyId"  uuid not null references properties(id) on delete cascade,
  "unitPrice"   numeric(12,2) not null,
  quarter       text not null,
  "recordedAt"  timestamptz not null default now()
);

alter table valuation_history enable row level security;
create policy "Authenticated users can read" on valuation_history for select using (auth.role() = 'authenticated');
create policy "Admins have full access"      on valuation_history for all using (auth.jwt() ->> 'role' = 'admin');

-- ── OWNERSHIPS ───────────────────────────────────────────────
create table ownerships (
  id              uuid primary key default gen_random_uuid(),
  "investorId"    uuid not null references investors(id) on delete cascade,
  "propertyId"    uuid not null references properties(id) on delete cascade,
  units           integer not null,
  "acquiredPrice" numeric(12,2) not null,
  "acquiredDate"  date not null,
  unique ("investorId", "propertyId")
);

alter table ownerships enable row level security;
create policy "Investors can read own ownerships" on ownerships for select using (auth.uid() = "investorId");
create policy "Admins have full access"           on ownerships for all using (auth.jwt() ->> 'role' = 'admin');

-- ── TRANSACTIONS ─────────────────────────────────────────────
create table transactions (
  id              text primary key,
  "investorId"    uuid not null references investors(id) on delete cascade,
  "propertyId"    uuid references properties(id) on delete set null,
  type            text not null,
  units           integer,
  gross           numeric(15,2) not null default 0,
  fee             numeric(15,2) not null default 0,
  net             numeric(15,2) not null default 0,
  status          text not null,
  "razorpayId"    text,
  date            date not null,
  period          text,
  notes           text
);

alter table transactions enable row level security;
create policy "Investors can read own transactions" on transactions for select using (auth.uid() = "investorId");
create policy "Admins have full access"             on transactions for all using (auth.jwt() ->> 'role' = 'admin');

-- ── TRANSACTION HISTORY ──────────────────────────────────────
create table transaction_history (
  id                text primary key default gen_random_uuid()::text,
  "transactionId"   text not null references transactions(id) on delete cascade,
  status            text not null,
  date              date not null,
  by                text not null
);

alter table transaction_history enable row level security;
create policy "Investors can read history of own txns"
  on transaction_history for select
  using (exists (select 1 from transactions t where t.id = "transactionId" and t."investorId" = auth.uid()));
create policy "Admins have full access" on transaction_history for all using (auth.jwt() ->> 'role' = 'admin');

-- ── DISTRIBUTIONS ────────────────────────────────────────────
create table distributions (
  id                uuid primary key default gen_random_uuid(),
  "propertyId"      uuid not null references properties(id) on delete cascade,
  period            text not null,
  "perUnit"         numeric(12,2) not null,
  "feePct"          numeric(5,2) not null,
  "grossTotal"      numeric(15,2) not null,
  "feeTotal"        numeric(15,2) not null,
  "netTotal"        numeric(15,2) not null,
  "investorCount"   integer not null,
  date              date not null,
  status            text not null default 'Completed'
);

alter table distributions enable row level security;
create policy "Authenticated users can read" on distributions for select using (auth.role() = 'authenticated');
create policy "Admins have full access"      on distributions for all using (auth.jwt() ->> 'role' = 'admin');

-- ── PENDING FEES ─────────────────────────────────────────────
create table pending_fees (
  id            uuid primary key default gen_random_uuid(),
  "investorId"  uuid not null references investors(id) on delete cascade,
  amount        numeric(12,2) not null,
  period        text not null,
  status        text not null default 'Pending'
);

alter table pending_fees enable row level security;
create policy "Investors can read own fees" on pending_fees for select using (auth.uid() = "investorId");
create policy "Admins have full access"     on pending_fees for all using (auth.jwt() ->> 'role' = 'admin');

-- ── DOCUMENTS ────────────────────────────────────────────────
create table documents (
  id              uuid primary key default gen_random_uuid(),
  "investorId"    uuid not null references investors(id) on delete cascade,
  "propertyId"    uuid references properties(id) on delete set null,
  type            text not null,
  label           text not null,
  "storagePath"   text not null,
  "issuedAt"      timestamptz not null default now(),
  version         integer not null default 1
);

alter table documents enable row level security;
create policy "Investors can read own documents" on documents for select using (auth.uid() = "investorId");
create policy "Admins have full access"          on documents for all using (auth.jwt() ->> 'role' = 'admin');
