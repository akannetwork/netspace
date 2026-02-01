DO $$
DECLARE
    contact_count INTEGER;
    personnel_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contact_count FROM contacts;
    SELECT COUNT(*) INTO personnel_count FROM contacts WHERE type = 'personnel';
    
    RAISE NOTICE 'Total Contacts: %, Personnel: %', contact_count, personnel_count;
END $$;
