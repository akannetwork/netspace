-- Fix Checks Table Schema - Add missing columns
DO $$
BEGIN
    -- check_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'check_number') THEN
        ALTER TABLE checks ADD COLUMN check_number text;
    END IF;

    -- bank_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'bank_name') THEN
        ALTER TABLE checks ADD COLUMN bank_name text;
    END IF;

    -- amount (should exist, but let's be safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'amount') THEN
        ALTER TABLE checks ADD COLUMN amount decimal DEFAULT 0;
    END IF;

    -- due_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'due_date') THEN
        ALTER TABLE checks ADD COLUMN due_date date;
    END IF;
END $$;
