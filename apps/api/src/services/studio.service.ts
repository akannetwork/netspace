import { supabase } from '../config/supabase';

export class StudioService {

    /**
     * Get settings for a specific tenant (Private/Pro View)
     */
    async getSettings(tenantId: string) {
        const { data, error } = await supabase
            .from('tenant_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Not found, return default empty object
            return {};
        }

        if (error) throw error;
        return data;
    }

    /**
     * Update or Create settings
     */
    async updateSettings(tenantId: string, settings: any) {
        const payload = {
            tenant_id: tenantId,
            site_title: settings.site_title,
            logo_url: settings.logo_url,
            primary_color: settings.primary_color,
            hero_title: settings.hero_title,
            hero_description: settings.hero_description,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('tenant_settings')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Public Method: Get settings by Slug (for Storefront)
     */
    async getPublicSettings(slug: string) {
        // First look up tenant id by slug? Or join.
        // Let's do a join to verify tenant exists and is active.

        const { data, error } = await supabase
            .from('tenants')
            .select(`
                id, 
                name,
                slug,
                status,
                tenant_settings (*)
            `)
            .eq('slug', slug)
            .single();

        if (error || !data) return null;
        if (data.status !== 'active') return { status: 'suspended' };

        // Check for ecommerce-enabled services for this tenant
        const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', data.id)
            .eq('product_type', 'service')
            .eq('is_active', true)
            .contains('channels', ['ecommerce']);

        return {
            tenant_id: data.id,
            name: data.name,
            slug: data.slug,
            ...(data.tenant_settings || {}),
            has_services: (count || 0) > 0
        };
    }
    /**
     * Public Method: Get active products by Slug
     */
    async getPublicProducts(slug: string) {
        // 1. Get Tenant ID
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, status')
            .eq('slug', slug)
            .single();

        if (!tenant || tenant.status !== 'active') return [];

        // 2. Get Products (Active & Ecommerce enabled only)
        const { data: products } = await supabase
            .from('products')
            .select(`
                id,
                name,
                description,
                price,
                currency,
                category_id,
                image_url,
                product_type
            `)
            .eq('tenant_id', tenant.id)
            .in('product_type', ['product', 'material'])
            .eq('is_active', true)
            .contains('channels', ['ecommerce'])
            .order('created_at', { ascending: false });

        return products || [];
    }

    /**
     * Public Method: Get active e-commerce services by Slug
     */
    async getPublicServices(slug: string) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, status')
            .eq('slug', slug)
            .single();

        if (!tenant || tenant.status !== 'active') return [];

        const { data: services } = await supabase
            .from('products')
            .select(`
                id,
                name,
                description,
                price,
                currency,
                unit,
                image_url
            `)
            .eq('tenant_id', tenant.id)
            .eq('product_type', 'service')
            .eq('is_active', true)
            .contains('channels', ['ecommerce'])
            .order('name');

        return services || [];
    }
}

export const studioService = new StudioService();
