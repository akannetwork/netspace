
-- Add contact_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_orders_contact ON orders(contact_id);

-- Optional: try to backfill based on phone/email matching if needed, but for now leave empty.
