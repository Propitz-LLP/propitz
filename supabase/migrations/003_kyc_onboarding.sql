-- KYC onboarding: identity/bank fields, draft resume support, private document bucket

alter table kyc_submissions
  add column if not exists "fullLegalName"     text,
  add column if not exists dob                  date,
  add column if not exists gender               text,
  add column if not exists address              text,
  add column if not exists ifsc                 text,
  add column if not exists "accountType"        text,
  add column if not exists "accountHolderName"  text,
  add column if not exists "currentStep"        integer not null default 1,
  add column if not exists status               text not null default 'draft';

-- One draft per investor keeps upsert simple; history not needed for MVP
create unique index if not exists kyc_submissions_investor_unique
  on kyc_submissions ("investorId");

-- The wizard saves progress step-by-step, so investors need update on their own row
create policy "Investors can update own submission" on kyc_submissions
  for update using (auth.uid() = "investorId");

-- Private bucket for KYC documents — served only via short-lived signed URLs
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;
