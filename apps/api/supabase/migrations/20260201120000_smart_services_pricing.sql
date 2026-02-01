
-- 1. Product Tablosuna Tip ve Fiyatlandırma Modeli Ekleme
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'product' CHECK (product_type IN ('product', 'service'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'standard' CHECK (pricing_model IN ('standard', 'area_based', 'piecewise'));

-- 2. Sipariş Kalemlerine Konfigürasyon Desteği
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS configuration JSONB;

-- 3. Hizmet Özellikleri ( Kağıt Türü, Selofan, Lak vb.)
CREATE TABLE IF NOT EXISTS service_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'select' CHECK (type IN ('select', 'boolean', 'number', 'text')),
    is_required BOOLEAN DEFAULT true,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Özellik Seçenekleri ve Fiyat Etkileri
CREATE TABLE IF NOT EXISTS service_attribute_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_id UUID REFERENCES service_attributes(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price_impact NUMERIC(15,2) DEFAULT 0,
    impact_type TEXT DEFAULT 'fixed' CHECK (impact_type IN ('fixed', 'percentage')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Miktara Göre Fiyatlandırma (Piecewise Pricing - Örn: 1000 adette X, 5000 adette Y fiyat)
CREATE TABLE IF NOT EXISTS service_quantity_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INT NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Şimdilik contacts ile aynı mantıkta tenant_id kontrolü
ALTER TABLE service_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quantity_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for same tenant" ON service_attributes
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_attributes_product_id ON service_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_service_attribute_options_attr_id ON service_attribute_options(attribute_id);
CREATE INDEX IF NOT EXISTS idx_service_quantity_steps_product_id ON service_quantity_steps(product_id);
