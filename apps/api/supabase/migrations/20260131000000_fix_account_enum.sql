-- Fix missing enum values and remove restrictive constraint
-- 2026-01-31

-- 1. Drop the constraint that blocks new types (if it exists)
ALTER TABLE finance_accounts DROP CONSTRAINT IF EXISTS finance_accounts_type_check;

-- 2. Add missing values to Enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'credit_card';
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'check_account';

-- 3. (Optional) If the column was somehow TEXT, we can try to re-apply the correct type
-- ALTER TABLE finance_accounts ALTER COLUMN type TYPE account_type USING type::account_type;
