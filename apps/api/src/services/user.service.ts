
import { supabase } from '../config/supabase';
import * as bcrypt from 'bcryptjs';

export class UserService {
    /**
     * Get all users in a tenant
     */
    async getTenantUsers(tenantId: string) {
        const { data, error } = await supabase
            .from('tenant_users')
            .select(`
                id,
                user_id,
                role,
                role_id,
                created_at,
                is_super_admin,
                can_inventory,
                can_finance,
                can_orders,
                can_personnel,
                can_depo,
                can_go,
                can_portal,
                can_go,
                can_portal,
                can_web,
                can_office,
                authorized_branches,
                personnel_id,
                permission_personnel: personnel_id ( name, type ),
                users (
                    id,
                    phone
                ),
                roles (
                    id,
                    name
                )
            `)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    /**
     * Get all roles in a tenant
     */
    async getTenantRoles(tenantId: string) {
        const { data, error } = await supabase
            .from('roles')
            .select(`
                id,
                name,
                description,
                role_permissions (
                    permission_id,
                    permissions (
                        id,
                        slug,
                        name,
                        tab
                    )
                )
            `)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    /**
     * Invite / Add a user to the tenant
     */
    async addTenantUser(tenantId: string, input: { phone: string, role_id: string }) {
        // 1. Find or create the global user
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('phone', input.phone)
            .single();

        let userId = user?.id;

        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ phone: input.phone })
                .select()
                .single();

            if (createError || !newUser) throw new Error('Global user creation failed');
            userId = newUser.id;
        }

        // 2. Check if already a member
        const { data: existing } = await supabase
            .from('tenant_users')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .single();

        if (existing) throw new Error('User is already a member of this tenant');

        // 3. Get Role name for backward compat
        const { data: role } = await supabase
            .from('roles')
            .select('name')
            .eq('id', input.role_id)
            .single();

        // 4. Create membership
        const { data, error } = await supabase
            .from('tenant_users')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                role_id: input.role_id,
                role: role?.name?.toLowerCase() || 'staff'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update user role
     */
    async updateUserRole(tenantId: string, membershipId: string, roleId: string) {
        const { data: role } = await supabase
            .from('roles')
            .select('name')
            .eq('id', roleId)
            .single();

        const { data, error } = await supabase
            .from('tenant_users')
            .update({
                role_id: roleId,
                role: role?.name?.toLowerCase() || 'staff'
            })
            .eq('id', membershipId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Remove user from tenant
     */
    async removeTenantUser(tenantId: string, membershipId: string) {
        const { error } = await supabase
            .from('tenant_users')
            .delete()
            .eq('id', membershipId)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    }
    /**
     * Get Personnel who are NOT yet users in this tenant
     */
    async getPersonnelCandidates(tenantId: string) {
        // 1. Get all personnel
        const { data: personnel } = await supabase
            .from('contacts')
            .select('id, name, phone, email, type')
            .eq('tenant_id', tenantId)
            .eq('type', 'personnel');

        if (!personnel) return [];

        // 2. Get all tenant_users personnel_ids
        const { data: existingMap } = await supabase
            .from('tenant_users')
            .select('personnel_id')
            .eq('tenant_id', tenantId)
            .not('personnel_id', 'is', null);

        const takenIds = new Set(existingMap?.map(e => e.personnel_id) || []);

        // 3. Filter
        return personnel.filter(p => !takenIds.has(p.id));
    }

    /**
     * Create User from Personnel
     */
    async createPersonnelUser(tenantId: string, input: any) {
        const { personnel_id, password, permissions, authorized_branches } = input;

        // 1. Get Personnel Info
        console.log('[UserService] Creating user for personnel:', personnel_id);

        const { data: personnel } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', personnel_id)
            .single();

        if (!personnel) throw new Error('Personnel not found');
        console.log('[UserService] Personnel found:', personnel.name, personnel.phone);

        if (!personnel.phone) throw new Error('Personnel must have a phone number');

        // 2. Create Auth User (or get existing by phone)
        let authUserId: string;

        // Try creating
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            phone: personnel.phone,
            password: password,
            email: personnel.email || undefined,
            user_metadata: { name: personnel.name },
            phone_confirm: true,
            email_confirm: true
        });

        if (authError) {
            // If already exists, we need to find it by phone (Admin API listUsers is expensive, maybe just try sign in? No.)
            // Actually, for this flow, let's assume if it fails, we abort or the user handles "already exists".
            // But wait, maybe the user exists in 'public.users' but not 'auth'? 
            // Let's check public.users first.
            // If authError message says "already registered", we try to find the user.
            if (authError.message?.includes('already registered') || authError.status === 422) {
                // Fallback: Find in public users table (assuming it's synced with auth id)
                const { data: pubUser } = await supabase.from('users').select('id').eq('phone', personnel.phone).single();
                if (pubUser) authUserId = pubUser.id;
                else throw new Error('User exists in Auth but not in public DB. Contact support.');
            } else {
                throw authError;
            }
        } else {
            authUserId = authData.user.id;
        }

        // 2b. Hash Password for Custom Auth
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Ensure Public User Record Exists with Password Hash and Tenant
        const { error: upsertError } = await supabase.from('users').upsert({
            id: authUserId, // Force ID match
            phone: personnel.phone,
            password_hash: passwordHash,
            tenant_id: tenantId
        });

        if (upsertError) throw upsertError;

        // 4. Create Tenant User with Permissions
        const { data, error } = await supabase
            .from('tenant_users')
            .insert({
                tenant_id: tenantId,
                user_id: authUserId,
                personnel_id: personnel_id,
                role: 'staff', // Legacy
                // Permissions
                ...permissions,
                authorized_branches: authorized_branches || []
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') throw new Error('This personnel is already linked to a user.');
            throw error;
        }

        return data;
    }

    /**
     * Update User Permissions
     */
    async updateUserPermissions(tenantId: string, userId: string, updates: any) {
        const { data, error } = await supabase
            .from('tenant_users')
            .update({
                ...updates
            })
            .eq('id', userId) // tenant_users.id (membership id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create Customer User (Tenant Web Site Register)
     */
    async createCustomerUser(tenantId: string, input: { name: string, phone: string, password: string }) {
        const { name, phone, password } = input;

        // 1. Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phone)
            .eq('tenant_id', tenantId)
            .single();

        if (existingUser) {
            throw new Error('Bu telefon numarası ile kayıtlı bir kullanıcı zaten var.');
        }

        // 2. Hash Password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Create Contact (CRM Record)
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert({
                tenant_id: tenantId,
                name: name,
                phone: phone,
                type: 'customer'
            })
            .select()
            .single();

        if (contactError) throw contactError;

        // 4. Create User (Database Only)
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                tenant_id: tenantId,
                phone: phone,
                password_hash: passwordHash,
            })
            .select()
            .single();

        if (userError) throw userError;

        return { user: newUser, contact };
    }
}

export const userService = new UserService();
