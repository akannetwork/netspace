-- Add order_id column to checks table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checks' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE checks ADD COLUMN order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_checks_order_id ON checks(order_id);
