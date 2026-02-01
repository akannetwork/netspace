-- 1. Drop old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;

-- 2. Add new constraint with 'web' and 'pos'
ALTER TABLE orders ADD CONSTRAINT orders_channel_check 
CHECK (channel IN ('store', 'market', 'web', 'pos', 'office', 'mobile'));

-- 3. Fix Data (ORD -> web, POS -> pos)
UPDATE orders
SET channel = 'web'
WHERE order_number LIKE 'ORD-%';

UPDATE orders
SET channel = 'pos'
WHERE order_number LIKE 'POS-%';
