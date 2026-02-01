-- Create Enum Types with Safety Checks
DO $$ BEGIN
    CREATE TYPE contact_type AS ENUM ('customer', 'supplier', 'subcontractor', 'personnel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_category AS ENUM ('sale', 'purchase', 'payment', 'collection', 'opening_balance', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Contacts Table
create table if not exists contacts (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid not null references tenants(id) on delete cascade,
    type contact_type not null,
    name text not null,
    email text,
    phone text,
    tax_id text,
    address jsonb,
    balance decimal default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create Transactions Table (Ledger)
create table if not exists transactions (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid not null references tenants(id) on delete cascade,
    contact_id uuid not null references contacts(id) on delete cascade,
    type transaction_type not null,
    category transaction_category not null,
    amount decimal not null,
    description text,
    reference_id uuid, -- Can link to order_id, etc.
    created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_contacts_tenant on contacts(tenant_id);
create index if not exists idx_contacts_type on contacts(type);
create index if not exists idx_transactions_contact on transactions(contact_id);
create index if not exists idx_transactions_tenant on transactions(tenant_id);
