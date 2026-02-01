-- Add can_office permission to tenant_users
ALTER TABLE public.tenant_users 
ADD COLUMN IF NOT EXISTS can_office BOOLEAN DEFAULT FALSE;

-- Update existing users: If they have any office sub-permission, give them can_office = TRUE
UPDATE public.tenant_users
SET can_office = TRUE
WHERE can_finance = TRUE 
   OR can_inventory = TRUE 
   OR can_orders = TRUE 
   OR can_personnel = TRUE 
   OR can_depo = TRUE;
