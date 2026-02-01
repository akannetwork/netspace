import { supabase } from '../config/supabase';

export class InventoryService {

    /**
     * Get inventory for all products across all branches or specific branch
     */
    async getInventory(tenantId: string, query: any = {}) {
        // Build query
        // We want to join products and branches to give context

        let dbQuery = supabase
            .from('stocks')
            .select(`
                id, 
                quantity, 
                reserved_quantity, 
                updated_at,
                product_id,
                branch_id,
                products!inner(id, name, sku, tenant_id),
                branches!inner(id, name, type)
            `)
            .eq('products.tenant_id', tenantId);

        if (query.branch_id) {
            dbQuery = dbQuery.eq('branch_id', query.branch_id);
        }

        if (query.product_id) {
            dbQuery = dbQuery.eq('product_id', query.product_id);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;
        return data;
    }

    /**
     * Get all branches for tenant
     */
    async getBranches(tenantId: string) {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    async createBranch(tenantId: string, input: any) {
        const { data, error } = await supabase
            .from('branches')
            .insert({
                ...input,
                tenant_id: tenantId,
                is_active: input.is_active ?? true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBranch(tenantId: string, id: string, input: any) {
        const { data, error } = await supabase
            .from('branches')
            .update({
                name: input.name,
                type: input.type,
                address: input.address,
                phone: input.phone,
                is_active: input.is_active
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteBranch(tenantId: string, id: string) {
        // Warning: Deleting a branch should ideally check for linked data (stocks, orders)
        // For now, simple delete
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    }

    /**
     * Adjust stock quantity (Absolute set or relative increment not implemented yet, just SET)
     */
    async adjustStock(tenantId: string, input: any) {
        const { product_id, branch_id, quantity } = input;

        // Verify product belongs to tenant
        const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('id', product_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!product) throw new Error('Product not found in this tenant');

        // Upsert stock record
        const { data, error } = await supabase
            .from('stocks')
            .upsert({
                product_id,
                branch_id,
                quantity,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'product_id, branch_id',
                ignoreDuplicates: false
            })
            .select() // Ensure we ask for the inserted data back
            .single();

        if (error) throw error;

        // TODO: Create an 'inventory_log' entry here for audit trail

        return data;
    }
}

export const inventoryService = new InventoryService();
