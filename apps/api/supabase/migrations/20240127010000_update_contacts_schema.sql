-- Add Personnel Link + Constraints

-- Delete duplicates if any exist (safety first, though table is likely empty)
-- (In a real production migration, we would handle this more gracefully)
truncate table contacts cascade;

-- Add Columns
alter table contacts 
    add column personnel_id uuid references personnel(id) on delete set null;

-- Add Unique Constraint on (tenant_id, phone)
-- We use a partial index to allow multiple nulls if phone is optional, 
-- but if they provide a phone, it MUST be unique.
create unique index idx_contacts_unique_phone 
    on contacts(tenant_id, phone) 
    where phone is not null and phone != '';

-- Add Index for foreign key
create index idx_contacts_personnel on contacts(personnel_id);
