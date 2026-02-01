-- Create Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    personnel_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave', 'late')),
    multiplier NUMERIC DEFAULT 1.0, -- Supports 2X wages etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(personnel_id, date)
);

-- Enable RLS for timesheets
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's timesheets"
ON timesheets FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their tenant's timesheets"
ON timesheets FOR INSERT
WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant's timesheets"
ON timesheets FOR UPDATE
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant's timesheets"
ON timesheets FOR DELETE
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));


-- Update Contacts Table (Add Salary Config)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS salary_type TEXT CHECK (salary_type IN ('monthly', 'daily', 'hybrid')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE;


-- Update Transaction Category Enum
-- We use a DO block to safely add values if they don't exist
DO $$
BEGIN
    ALTER TYPE transaction_category ADD VALUE 'salary';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE transaction_category ADD VALUE 'advance';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE transaction_category ADD VALUE 'commission';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE transaction_category ADD VALUE 'bonus';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- No need to check constraint if it is an Enum

