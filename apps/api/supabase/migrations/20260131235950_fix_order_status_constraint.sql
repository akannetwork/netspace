
-- Fix order status constraint to allow 'pending'
-- Previous constraint was likely: CHECK (status IN ('processing', 'shipped', 'delivered', 'cancelled'))

DO $$ 
BEGIN
    -- 1. Drop the old constraint if it exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- 2. Add the updated constraint including 'new'
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('new', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'));
    
    -- 3. Set default to 'new' if it wasn't
    ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'new';
END $$;
