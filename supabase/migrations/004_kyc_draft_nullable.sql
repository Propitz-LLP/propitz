-- KYC drafts are saved step-by-step, so identity/bank fields arrive later
alter table kyc_submissions
  alter column pan drop not null,
  alter column "aadhaarMasked" drop not null,
  alter column "bankAccount" drop not null,
  alter column "bankName" drop not null;
