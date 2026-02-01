
-- Add payment_status and payment_method to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Add index for performance on status filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
