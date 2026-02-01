-- Fix Checks Table Schema - Add missing description column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'description') THEN
        ALTER TABLE checks ADD COLUMN description text;
    END IF;
END $$;
