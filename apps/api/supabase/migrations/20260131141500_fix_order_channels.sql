-- Fix Channel Labels based on Order Number Prefix

-- 1. ORD -> web
UPDATE orders
SET channel = 'web'
WHERE order_number LIKE 'ORD-%';

-- 2. POS -> pos
UPDATE orders
SET channel = 'pos'
WHERE order_number LIKE 'POS-%';
