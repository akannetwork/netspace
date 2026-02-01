
-- Add order_id to transactions table if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
