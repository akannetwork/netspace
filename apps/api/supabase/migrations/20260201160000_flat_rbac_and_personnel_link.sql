
-- 1. Add boolean permission columns to tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_inventory BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_finance BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_orders BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_personnel BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_depo BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_go BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_portal BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS can_web BOOLEAN DEFAULT false;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Add authorized_branches column (Array of UUIDs)
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS authorized_branches UUID[] DEFAULT '{}';

-- 3. Add personnel_id link
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES contacts(id);
ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_personnel_id_unique UNIQUE (personnel_id);

-- 4. Migrate existing owners to Super Admin
UPDATE tenant_users SET is_super_admin = true, can_inventory = true, can_finance = true, can_orders = true, can_personnel = true, can_depo = true, can_go = true, can_portal = true, can_web = true
WHERE role = 'owner';

-- 5. Authorized branches migration: If owner, authorize for all existing branches
DO $$
DECLARE
    t_id UUID;
    b_ids UUID[];
BEGIN
    FOR t_id IN SELECT id FROM tenants LOOP
        SELECT array_agg(id) INTO b_ids FROM branches WHERE tenant_id = t_id;
        
        UPDATE tenant_users 
        SET authorized_branches = b_ids
        WHERE tenant_id = t_id AND is_super_admin = true;
    END LOOP;
END $$;

-- OK
