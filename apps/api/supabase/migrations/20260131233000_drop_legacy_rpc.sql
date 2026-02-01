
-- Drop the conflicting legacy function signature
-- This one accepts public.order_item_input[] which causes ambiguity with the new jsonb implementation
DROP FUNCTION IF EXISTS public.create_order(uuid, text, text, text, text, text, numeric, text, public.order_item_input[], uuid);
