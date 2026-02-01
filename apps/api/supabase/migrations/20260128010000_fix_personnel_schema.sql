-- Move HR fields to personnel table
ALTER TABLE personnel
ADD COLUMN IF NOT EXISTS salary_type TEXT CHECK (salary_type IN ('monthly', 'daily', 'hybrid')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- Fix Timesheets FK to point to personnel instead of contacts
ALTER TABLE timesheets
DROP CONSTRAINT IF EXISTS timesheets_personnel_id_fkey;

ALTER TABLE timesheets
ADD CONSTRAINT timesheets_personnel_id_fkey 
FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE;

-- Allow Transactions to be linked to Personnel
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES personnel(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_personnel_id ON transactions(personnel_id);
