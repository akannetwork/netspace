-- Migration: Unify Personnel into Contacts (Robust Merge Version)

-- 1. Ensure Contacts table has HR columns
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS salary_type TEXT CHECK (salary_type IN ('monthly', 'daily', 'hybrid')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Drop Constraints temporarily to allow data migration
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_personnel_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_personnel_id_fkey;

-- 3. Migrate / Merge Logic
DO $$
DECLARE
    r RECORD;
    existing_contact_id UUID;
BEGIN
    FOR r IN SELECT * FROM personnel LOOP
        -- Check for phone collision (Same Tenant, Same Phone)
        existing_contact_id := NULL;
        IF r.phone IS NOT NULL AND r.phone <> '' THEN
             SELECT id INTO existing_contact_id FROM contacts WHERE tenant_id = r.tenant_id AND phone = r.phone LIMIT 1;
        END IF;

        IF existing_contact_id IS NOT NULL THEN
            -- CONFLICT FOUND: MERGE STRATEGY
            -- Since a contact with this phone already exists, we will use THAT contact.
            -- We will move this personnel's history to that contact.
            
            RAISE NOTICE 'Merging personnel % (Phone: %) into existing contact %', r.first_name, r.phone, existing_contact_id;

            -- Update existing contact with HR info
            UPDATE contacts SET
                type = 'personnel', -- Ensure they are marked as personnel (or maybe we allow hybrid? Setting to personnel is safer for visibility)
                salary_type = r.salary_type,
                base_salary = r.base_salary,
                daily_rate = r.daily_rate,
                portal_access = r.portal_access,
                balance = COALESCE(balance, 0) + COALESCE(r.balance, 0)
            WHERE id = existing_contact_id;

            -- Remap Timesheets to existing contact
            UPDATE timesheets
            SET personnel_id = existing_contact_id
            WHERE personnel_id = r.id;

            -- Remap Transactions to existing contact
            -- Move personnel_id -> contact_id (If contact_id is null)
            -- If contact_id is already set on the transaction, we might strictly leave it or force overwrite.
            -- Logic: These transactions BELONG to this person. So they should belong to the merged contact.
            UPDATE transactions
            SET contact_id = existing_contact_id
            WHERE personnel_id = r.id;
            
        ELSE
            -- NO CONFLICT: INSERT STRATEGY
            -- We try to use r.id.
            IF NOT EXISTS (SELECT 1 FROM contacts WHERE id = r.id) THEN
                INSERT INTO contacts (
                    id, tenant_id, type, name, email, phone, address, 
                    salary_type, base_salary, daily_rate, portal_access, balance,
                    created_at, updated_at
                ) VALUES (
                    r.id, r.tenant_id, 'personnel', r.first_name || ' ' || r.last_name, r.email, r.phone, 
                    jsonb_build_object('address', ''), 
                    r.salary_type, r.base_salary, r.daily_rate, r.portal_access, r.balance,
                    r.created_at, NOW() -- Use NOW() for updated_at
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- 4. Fix Foreign Keys in Timesheets (Now pointing to Contacts)
ALTER TABLE timesheets ADD CONSTRAINT timesheets_personnel_id_fkey 
    FOREIGN KEY (personnel_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- 5. Finalize Transactions (Bulk Update for non-merged records)
-- For records that were simply inserted with same ID:
UPDATE transactions
SET contact_id = personnel_id
WHERE contact_id IS NULL AND personnel_id IS NOT NULL;

-- Remove personnel_id column from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS personnel_id;

-- 6. Drop Personnel Table
-- 6. Drop Personnel Table and Dependencies
DROP TABLE IF EXISTS personnel CASCADE;

-- 7. Cleanup Contacts table (remove self-reference if exists)
ALTER TABLE contacts DROP COLUMN IF EXISTS personnel_id;
