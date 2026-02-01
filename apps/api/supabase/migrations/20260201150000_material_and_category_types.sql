-- Migration: Product/Material/Service Enhancements

-- 1. Update product_type to include 'material'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;
ALTER TABLE products ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('product', 'service', 'material'));

-- 2. Add type to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product' CHECK (type IN ('product', 'material', 'service'));

-- 3. Enhance Service Pricing Rules
ALTER TABLE service_attribute_options DROP CONSTRAINT IF EXISTS service_attribute_options_impact_type_check;
ALTER TABLE service_attribute_options ADD CONSTRAINT service_attribute_options_impact_type_check CHECK (impact_type IN ('fixed', 'percentage', 'per_unit', 'multiplier'));

-- OK. 