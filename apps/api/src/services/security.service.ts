import { supabase } from '../config/supabase';

interface PermissionCheck {
    userId: string;
    tenantId: string;
    permission: string; // e.g. 'office.inventory.create'
}

interface TabCheck {
    userId: string;
    tenantId: string;
    tab: 'dashboard' | 'office' | 'market' | 'go' | 'studio' | 'portal';
}

export class SecurityService {

    /**
     * Checks if the user has access to a specific tab
     * Logic: User must have ANY permission that belongs to that tab
     */
    async hasTabAccess(input: TabCheck): Promise<boolean> {
        const { userId, tenantId, tab } = input;

        const { data: membership } = await supabase
            .from('tenant_users')
            .select(`
                is_super_admin, 
                can_inventory, can_finance, can_orders, can_personnel, can_depo,
                can_go, can_portal, can_web
            `)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (!membership) return false;
        if (membership.is_super_admin) return true;

        switch (tab) {
            case 'office':
                return membership.can_inventory || membership.can_finance || membership.can_orders || membership.can_personnel || membership.can_depo;
            case 'go':
                return membership.can_go;
            case 'portal':
                return membership.can_portal;
            case 'market':
            case 'studio':
                return membership.can_web;
            case 'dashboard':
                return true; // Dashboard is public as per request
            default:
                return false;
        }
    }

    /**
     * Checks if the user has a specific permission
     */
    async hasPermission(input: PermissionCheck): Promise<boolean> {
        const { userId, tenantId, permission } = input;

        const { data: m } = await supabase
            .from('tenant_users')
            .select(`
                is_super_admin, 
                can_inventory, can_finance, can_orders, can_personnel, can_depo,
                can_go, can_portal, can_web
            `)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (!m) return false;
        if (m.is_super_admin) return true;

        // Map string permissions to boolean flags
        if (permission.startsWith('office.inventory.')) return m.can_inventory;
        if (permission.startsWith('office.finance.')) return m.can_finance;
        if (permission.startsWith('office.contacts.')) return m.can_finance; // Moved under finance
        if (permission.startsWith('office.orders.')) return m.can_orders;
        if (permission.startsWith('office.hr.')) return m.can_personnel;
        if (permission.startsWith('office.personnel.')) return m.can_personnel;
        if (permission.startsWith('office.depo.')) return m.can_depo;
        if (permission.startsWith('office.settings.')) return m.is_super_admin;

        if (permission.startsWith('go.')) return m.can_go;
        if (permission.startsWith('portal.')) return m.can_portal;
        if (permission.startsWith('web.')) return m.can_web;

        return false;
    }
}

export const securityService = new SecurityService();
