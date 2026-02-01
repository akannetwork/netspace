
-- 1. Permisson Geliştirmeleri (Yeni yetkiler ekliyoruz)
INSERT INTO permissions (slug, name, tab, module) 
VALUES 
    ('office.finance.view', 'Finans Görüntüle', 'office', 'finance'),
    ('office.finance.manage', 'Finans Yönet', 'office', 'finance'),
    ('office.contacts.view', 'Rehber Görüntüle', 'office', 'contacts'),
    ('office.contacts.manage', 'Rehber Yönet', 'office', 'contacts'),
    ('office.hr.view', 'İK Görüntüle', 'office', 'hr'),
    ('office.hr.manage', 'İK Yönet', 'office', 'hr'),
    ('office.settings.view', 'Ayarlar Görüntüle', 'office', 'settings'),
    ('office.settings.manage', 'Ayarlar Yönet', 'office', 'settings'),
    ('office.users.view', 'Kullanıcıları Görüntüle', 'office', 'settings'),
    ('office.users.manage', 'Kullanıcıları Yönet', 'office', 'settings')
ON CONFLICT (slug) DO NOTHING;

-- 2. tenant_users tablosuna role_id ekle
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- 3. Mevcut şubeler/tenantlar için varsayılan roller oluştur
DO $$
DECLARE
    t_id UUID;
    admin_role_id UUID;
    manager_role_id UUID;
    staff_role_id UUID;
BEGIN
    FOR t_id IN SELECT id FROM tenants LOOP
        -- Admin Rolü (Yoksa oluştur)
        INSERT INTO roles (tenant_id, name, description)
        VALUES (t_id, 'Admin', 'Tam yetkili sahip')
        ON CONFLICT DO NOTHING
        RETURNING id INTO admin_role_id;
        
        IF admin_role_id IS NULL THEN
            SELECT id INTO admin_role_id FROM roles WHERE tenant_id = t_id AND name = 'Admin' LIMIT 1;
        END IF;

        -- Manager Rolü
        INSERT INTO roles (tenant_id, name, description)
        VALUES (t_id, 'Manager', 'Yönetici yetkileri')
        ON CONFLICT DO NOTHING
        RETURNING id INTO manager_role_id;

        IF manager_role_id IS NULL THEN
            SELECT id INTO manager_role_id FROM roles WHERE tenant_id = t_id AND name = 'Manager' LIMIT 1;
        END IF;

        -- Staff Rolü
        INSERT INTO roles (tenant_id, name, description)
        VALUES (t_id, 'Staff', 'Personel yetkileri')
        ON CONFLICT DO NOTHING
        RETURNING id INTO staff_role_id;

        IF staff_role_id IS NULL THEN
            SELECT id INTO staff_role_id FROM roles WHERE tenant_id = t_id AND name = 'Staff' LIMIT 1;
        END IF;

        -- Admin'e TÜM yetkileri ver
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions
        ON CONFLICT DO NOTHING;

        -- Manager'a bazı yetkileri ver (Dashboard, Sales, Inventory)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT manager_role_id, id FROM permissions 
        WHERE slug IN ('dashboard.view', 'office.inventory.view', 'office.inventory.create', 'office.orders.view', 'office.orders.manage', 'office.contacts.view')
        ON CONFLICT DO NOTHING;

        -- Staff'a kısıtlı yetki ver
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT staff_role_id, id FROM permissions 
        WHERE slug IN ('office.inventory.view', 'office.orders.view')
        ON CONFLICT DO NOTHING;

        -- Mevcut 'owner' olanları Admin rolüne bağla
        UPDATE tenant_users 
        SET role_id = admin_role_id
        WHERE tenant_id = t_id AND role = 'owner' AND role_id IS NULL;

    END LOOP;
END $$;
