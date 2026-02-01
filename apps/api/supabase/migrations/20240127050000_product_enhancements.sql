-- Add new columns for Product Enhancements
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price decimal default 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

-- Create Index for Slug
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Ensure slug is unique per tenant
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_tenant_unique;
ALTER TABLE products ADD CONSTRAINT products_slug_tenant_unique UNIQUE (tenant_id, slug);
