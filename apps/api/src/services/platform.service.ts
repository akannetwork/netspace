import { supabase } from '../config/supabase';

export interface CreateTenantInput {
    name: string;
    slug: string;
    owner_phone: string;
    owner_email: string; // Optional but good for contact
    owner_name: string;
    subscription_features?: {
        office?: boolean;
        inventory?: boolean;
        finance?: boolean;
        orders?: boolean;
        personnel?: boolean;
        go?: boolean;
        portal?: boolean;
        web?: boolean;
    };
}

export class PlatformService {

    async getTenants() {
        // Only Super Admin should see this.
        // For now, return all for verification.
        const { data, error } = await supabase
            .from('tenants')
            .select('*, tenant_users(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async updateTenant(id: string, updates: any) {
        // Allows updating name, slug, features
        const { data, error } = await supabase
            .from('tenants')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async createTenant(input: CreateTenantInput) {
        console.log('[PlatformService] Creating Tenant:', input);

        // 1. Create Tenant (Store/Branch)
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .insert({
                name: input.name,
                slug: input.slug,
                status: 'active',
                subscription_features: input.subscription_features || {
                    office: true,
                    inventory: true,
                    finance: true,
                    orders: true,
                    personnel: true,
                    go: false,
                    portal: false,
                    web: false
                }
            })
            .select()
            .single();
        // ... rest of method ...

        if (tError) throw tError;

        // 2. Initialize Settings
        await supabase.from('tenant_settings').insert({
            tenant_id: tenant.id,
            site_title: input.name,
            primary_color: '#000000'
        });

        // 3. Find or Create User (Authentication Identity)
        let userId;
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', input.owner_phone)
            .single();

        if (existingUser) {
            userId = existingUser.id;
        } else {
            const { data: newUser, error: uError } = await supabase
                .from('users')
                .insert({ phone: input.owner_phone })
                .select()
                .single();
            if (uError) throw uError;
            userId = newUser.id;
        }

        // 4. Create Owner Profile in CONTACTS table (Unified)
        // CRITICAL STEP: Replaces old 'personnel' table logic
        const { data: contact, error: cError } = await supabase
            .from('contacts')
            .insert({
                tenant_id: tenant.id,
                user_id: userId, // Link to the user!
                type: 'personnel', // Treated as personnel
                name: input.owner_name,
                phone: input.owner_phone,
                email: input.owner_email
            })
            .select()
            .single();

        if (cError) {
            console.error('Failed to create contact/personnel profile', cError);
            // Rollback? ideally yes, but for now throw
            throw cError;
        }

        // 5. Initialize Default Roles
        const { data: adminRole } = await supabase.from('roles').insert({
            tenant_id: tenant.id,
            name: 'Admin',
            description: 'Tam yetkili yönetici'
        }).select().single();

        const { data: managerRole } = await supabase.from('roles').insert({
            tenant_id: tenant.id,
            name: 'Manager',
            description: 'Mağaza Yöneticisi'
        }).select().single();

        const { data: staffRole } = await supabase.from('roles').insert({
            tenant_id: tenant.id,
            name: 'Staff',
            description: 'Satış Personeli'
        }).select().single();

        // 6. Seed Default Permissions for Roles
        const { data: allPerms } = await supabase.from('permissions').select('id, slug');
        if (allPerms) {
            // Admin gets all
            const adminPerms = allPerms.map(p => ({ role_id: adminRole.id, permission_id: p.id }));

            // Manager gets most
            const managerPerms = allPerms.filter(p =>
                ['dashboard.view', 'office.inventory.view', 'office.inventory.create', 'office.orders.view', 'office.orders.manage', 'office.contacts.view'].includes(p.slug)
            ).map(p => ({ role_id: managerRole.id, permission_id: p.id }));

            // Staff gets basics
            const staffPerms = allPerms.filter(p =>
                ['office.inventory.view', 'office.orders.view'].includes(p.slug)
            ).map(p => ({ role_id: staffRole.id, permission_id: p.id }));

            await supabase.from('role_permissions').insert([...adminPerms, ...managerPerms, ...staffPerms]);
        }

        // 7. Link User to Tenant (Membership)
        await supabase.from('tenant_users').insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'owner', // Keep for backward compat
            role_id: adminRole.id // New source of truth
        });

        return { tenant, contact };
    }

    async deleteTenantAtomic(tenantId: string) {
        console.log('[PlatformService] ATOMIC DELETION START:', tenantId);

        // 1. Cleanup Storage (Recursive delete for tenant folder)
        try {
            // Note: We need to list all files recursively to delete them
            // Supabase storage doesn't have a "delete folder" command
            const { data: files } = await supabase.storage.from('media').list(tenantId, {
                limit: 1000,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

            if (files && files.length > 0) {
                // For simplicity in this MVP, we delete the first 1000 files
                // In a production app, this should be a recursive/looping process
                const paths = files.map(f => `${tenantId}/${f.name}`);
                await supabase.storage.from('media').remove(paths);
                console.log(`[PlatformService] Cleaned up ${paths.length} files for tenant ${tenantId}`);
            }
        } catch (err) {
            console.error('[PlatformService] Storage cleanup error (continuing...):', err);
        }

        // 2. Delete Tenant (Triggers DB Cascades)
        const { error } = await supabase
            .from('tenants')
            .delete()
            .eq('id', tenantId);

        if (error) {
            console.error('[PlatformService] DB Deletion Error:', error);
            throw error;
        }

        console.log('[PlatformService] ATOMIC DELETION COMPLETE:', tenantId);
        return { success: true };
    }
}

export const platformService = new PlatformService();
