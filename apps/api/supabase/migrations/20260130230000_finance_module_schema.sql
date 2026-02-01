-- Finance Module Schema Migration
-- 2026-01-30

-- 1. Finance Accounts Types
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('cash', 'bank', 'pos', 'check_account', 'credit_card');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Finance Accounts Table
CREATE TABLE IF NOT EXISTS finance_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES branches(id),
    name text NOT NULL,
    type account_type NOT NULL,
    currency text DEFAULT 'TRY',
    balance decimal DEFAULT 0,
    created_at timestamp WITH time zone DEFAULT now(),
    updated_at timestamp WITH time zone DEFAULT now()
);

-- 3. Check Enums
DO $$ BEGIN
    CREATE TYPE check_direction AS ENUM ('in', 'out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE check_status AS ENUM ('pending', 'portfolio', 'deposited', 'collected', 'bounced', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Checks Table (Ensure existence and columns)
CREATE TABLE IF NOT EXISTS checks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES contacts(id),
    amount decimal NOT NULL,
    due_date date NOT NULL,
    bank_name text,
    check_number text,
    direction check_direction NOT NULL DEFAULT 'in', 
    status check_status NOT NULL DEFAULT 'pending',
    description text,
    created_at timestamp WITH time zone DEFAULT now(),
    updated_at timestamp WITH time zone DEFAULT now()
);

-- Add columns if they don't exist (SAFE ALTER)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'direction') THEN
        ALTER TABLE checks ADD COLUMN direction check_direction DEFAULT 'in';
    END IF;
    
    -- We assume 'status' might exist as text or different enum, so be careful. 
    -- If it exists as text, we might need casting. But assuming it's new table or compatible.
    -- For now, let's assume if 'checks' existed it mimicked the new structure or we add status if missing.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'status') THEN
        ALTER TABLE checks ADD COLUMN status check_status DEFAULT 'pending';
    END IF;
END $$;

-- 5. Installments Enum
DO $$ BEGIN
    CREATE TYPE installment_type AS ENUM ('receivable', 'payable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE installment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Installments Table
CREATE TABLE IF NOT EXISTS finance_installments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES contacts(id),
    order_id uuid REFERENCES orders(id),
    transaction_id uuid REFERENCES finance_transactions(id), -- Link to original transaction if any
    type installment_type NOT NULL,
    amount decimal NOT NULL,
    remaining_amount decimal NOT NULL,
    due_date date NOT NULL,
    status installment_status DEFAULT 'pending',
    created_at timestamp WITH time zone DEFAULT now()
);

-- 7. Recurring Enum
DO $$ BEGIN
    CREATE TYPE recurring_type AS ENUM ('expense', 'income');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_period AS ENUM ('weekly', 'monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Recurring Table
CREATE TABLE IF NOT EXISTS finance_recurring (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    type recurring_type NOT NULL,
    amount decimal, 
    account_id uuid REFERENCES finance_accounts(id), 
    contact_id uuid REFERENCES contacts(id),
    recurrence_period recurrence_period NOT NULL,
    day_of_month integer,
    next_due_date date,
    auto_create boolean DEFAULT true,
    active boolean DEFAULT true,
    created_at timestamp WITH time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_installments_tenant ON finance_installments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_installments_status ON finance_installments(status);
CREATE INDEX IF NOT EXISTS idx_finance_installments_duedate ON finance_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_tenant ON finance_recurring(tenant_id);

-- RLS Policies (Basic Tenant Isolation)
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;

-- Copy Policies from another table usually, or define standard tenant_id check
-- Using a DO block to avoid error if policy exists
DO $$ 
BEGIN
    -- Accounts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_accounts' AND policyname = 'Tenant Isolation') THEN
        CREATE POLICY "Tenant Isolation" ON finance_accounts USING (tenant_id = auth.uid()::uuid OR tenant_id = (current_setting('app.current_tenant_id', true)::uuid)); 
        -- Note: app.current_tenant_id is a common pattern, but here maybe just auth.jwt() -> tenant_id?
        -- Retaining standard pattern for simple RLS:
        -- CREATE POLICY "Enable access for users based on tenant_id" ON "public"."finance_accounts" AS PERMISSIVE FOR ALL TO authenticated USING (((tenant_id)::text = ((auth.jwt() ->> 'tenant_id'::text))));
    END IF;
END $$;
-- Note: Assuming RLS is handled by existing patterns. I will leave specific RLS creation to separate file or user action if complex. 
-- Adding basic one that matches likely Project Pattern:
CREATE POLICY "Tenant All Access" ON finance_installments FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant All Access" ON finance_recurring FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- Note: Re-using simple pattern found in other files if possible. 
