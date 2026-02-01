-- Fix Checks Status Constraint
-- The check_status enum includes 'portfolio' but there's a conflicting CHECK constraint
-- This migration drops the old constraint and ensures the enum works correctly

-- 1. Drop the conflicting CHECK constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'checks_status_check' 
        AND conrelid = 'checks'::regclass
    ) THEN
        ALTER TABLE checks DROP CONSTRAINT checks_status_check;
    END IF;
END $$;

-- 2. Ensure the check_status enum has all required values
DO $$
BEGIN
    -- Add 'portfolio' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'portfolio' AND enumtypid = 'check_status'::regtype) THEN
        ALTER TYPE check_status ADD VALUE IF NOT EXISTS 'portfolio';
    END IF;
END $$;

-- 3. Update status column to use enum if it's still text
DO $$
BEGIN
    -- Check if the column is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checks' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Convert to enum
        ALTER TABLE checks 
        ALTER COLUMN status TYPE check_status 
        USING status::check_status;
    END IF;
END $$;
