-- Restore Owner Access
-- The 'personnel' drop likely cascaded and deleted tenant_users records.
-- This script re-establishes the link between the main user and the tenant.

DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Get the first user (usually the owner in local dev)
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;
    
    -- 2. Get the first tenant
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

    IF v_user_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Restoring access for User % to Tenant %', v_user_id, v_tenant_id;
        
        -- 3. Re-insert membership
        INSERT INTO tenant_users (tenant_id, user_id, role)
        VALUES (v_tenant_id, v_user_id, 'owner')
        ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = 'owner'; -- Ensure owner role
        
    ELSE
        RAISE NOTICE 'Could not find user or tenant to restore access.';
    END IF;
END $$;
