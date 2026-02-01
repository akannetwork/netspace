-- Add RLS Policy for checks table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'checks' 
        AND policyname = 'Tenant All Access'
    ) THEN
        CREATE POLICY "Tenant All Access" ON checks
            FOR ALL
            TO authenticated
            USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
            WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
END $$;
