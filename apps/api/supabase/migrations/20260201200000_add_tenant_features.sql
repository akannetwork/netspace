-- Add subscription_features JSONB column to tenants table
-- This allows us to gate features at the tenant level (SaaS Logic)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_features JSONB NOT NULL DEFAULT '{
    "office": true,
    "inventory": true,
    "finance": true,
    "orders": true,
    "personnel": true,
    "go": false,
    "portal": false,
    "web": false
}';

-- Comment explaining the column
COMMENT ON COLUMN public.tenants.subscription_features IS 'Stores enabled modules for the tenant subscription (e.g. { "finance": true, "web": false })';

-- WAIT 
