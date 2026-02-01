-- Migration: Add user_id to Contacts for Personnel Portal
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- Backfill user_id for personnel based on phone numbers matching existing users
DO $$
DECLARE
    r RECORD;
    v_user_id UUID;
BEGIN
    FOR r IN SELECT id, phone, tenant_id FROM contacts WHERE type = 'personnel' AND user_id IS NULL AND phone IS NOT NULL LOOP
        SELECT id INTO v_user_id FROM users WHERE phone = r.phone LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            UPDATE contacts SET user_id = v_user_id WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- Also update existing personnel type contacts to have portal_access if they are owners (for dev convenience)
UPDATE contacts SET portal_access = true WHERE type = 'personnel' AND (SELECT role FROM tenant_users WHERE user_id = contacts.user_id AND tenant_id = contacts.tenant_id) = 'owner';
