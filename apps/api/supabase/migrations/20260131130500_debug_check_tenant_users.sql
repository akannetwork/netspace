DO $$
DECLARE
    tu_count INTEGER;
    u_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tu_count FROM tenant_users;
    SELECT COUNT(*) INTO u_count FROM users;
    
    RAISE NOTICE 'Total Tenant Users: %, Total Users: %', tu_count, u_count;
END $$;
