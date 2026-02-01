import { supabase } from '../config/supabase';

export interface CreatePersonnelInput {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role_id?: string;
    // HR Fields
    salary_type?: 'monthly' | 'daily' | 'hybrid';
    base_salary?: number;
    daily_rate?: number;
    daily_currency?: string;
    portal_access?: boolean;
}

export class PersonnelService {

    /**
     * Get personnel list (Now from Contacts)
     * BranchID is currently ignored as we moved to unified Contacts.
     * Access Control is handled by RLS on Contacts.
     */
    async getPersonnel(tenantId: string, _branchId?: string) {
        let query = supabase
            .from('contacts')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('type', 'personnel');

        // Branch filtering removed as per migration. 
        // If we need it back, we'd add branch_id to contacts.

        const { data, error } = await query;
        if (error) throw error;

        // Map back to expected format if UI needs it, or return normalized
        return data.map((p: any) => {
            // Split name if needed or just return raw
            // Assuming UI might expect first_name/last_name separate, but let's see. 
            // Better to return flattened.
            return {
                ...p,
                first_name: p.name.split(' ')[0], // Approximate
                last_name: p.name.split(' ').slice(1).join(' '),
                role_name: p.role || 'Personel', // We added role column to contacts
                is_linked: true
            };
        });
    }

    /**
     * Get single personnel details
     */
    async getPersonnelById(tenantId: string, id: string) {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Personel bulunamadı');

        return {
            ...data,
            first_name: data.name.split(' ')[0],
            last_name: data.name.split(' ').slice(1).join(' '),
            role_name: data.role || 'Personel'
        };
    }

    /**
     * Create new personnel (As Contact)
     */
    async createPersonnel(tenantId: string, _branchId: string, input: CreatePersonnelInput) {
        // 1. Create Contact Record
        const fullName = `${input.first_name} ${input.last_name}`;

        const { data: contact, error: pError } = await supabase
            .from('contacts')
            .insert({
                tenant_id: tenantId,
                type: 'personnel',
                name: fullName,
                email: input.email,
                phone: input.phone,
                // HR Fields
                salary_type: input.salary_type || 'monthly',
                base_salary: input.base_salary || 0,
                daily_rate: input.daily_rate || 0,
                portal_access: input.portal_access || false,
                role: 'Personel' // Default role or derived
            })
            .select()
            .single();

        if (pError) throw pError;

        // Branch assignment is currently skipped as we don't have personnel_branches anymore.
        // If branchId is CRITICAL, we should add it to contacts later.

        return contact;
    }

    /**
     * Delete personnel (Contact)
     */
    async deletePersonnel(tenantId: string, id: string) {
        // 1. Delete Contact (Cascades to Timesheets and Transactions because of new FKs)
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;

        return { success: true };
    }
}

export const personnelService = new PersonnelService();
