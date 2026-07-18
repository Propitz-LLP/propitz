-- Property-level documents (due diligence, title report, brochure) have no
-- owning investor — they belong to the property and are visible to all
-- authenticated investors.
alter table documents alter column "investorId" drop not null;

create policy "Authenticated investors can read property documents" on documents
  for select using (auth.role() = 'authenticated' and "investorId" is null and "propertyId" is not null);

-- Private bucket for property-level documents, served via signed URLs only
insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;
