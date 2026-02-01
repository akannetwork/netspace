-- 1. Add tenant_id to users table (nullable initially)
ALTER TABLE public.users ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Backfill tenant_id from tenant_users
-- Assuming 1-to-1 mapping for existing users
UPDATE public.users u
SET tenant_id = tu.tenant_id
FROM public.tenant_users tu
WHERE tu.user_id = u.id;

-- 3. Drop old global unique constraint on phone
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- 4. Add new composite unique constraint (tenant_id, phone)
-- We enforce tenant_id NOT NULL only for FUTURE users? 
-- Or we try to enforce it now if update succeeded.
-- Let's enable RLS or check constraints if needed, but for now just the uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_phone_idx ON public.users (tenant_id, phone);
