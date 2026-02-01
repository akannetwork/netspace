import { supabase } from '../config/supabase';

export class CatalogService {

    // --- CATEGORIES ---

    async getCategories(tenantId: string, type?: string) {
        let dbQuery = supabase
            .from('categories')
            .select('*')
            .eq('tenant_id', tenantId);

        if (type) {
            dbQuery = dbQuery.eq('type', type);
        }

        const { data, error } = await dbQuery.order('name');

        if (error) throw error;
        return data;
    }

    async createCategory(tenantId: string, input: any) {
        // Generate slug from name if not provided
        const slug = input.slug || input.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const { data, error } = await supabase
            .from('categories')
            .insert({
                tenant_id: tenantId,
                parent_id: input.parent_id,
                name: input.name,
                slug: slug,
                type: input.type || 'product',
                is_active: input.is_active ?? true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateCategory(tenantId: string, id: string, input: any) {
        const { data, error } = await supabase
            .from('categories')
            .update({
                name: input.name,
                parent_id: input.parent_id,
                is_active: input.is_active
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteCategory(tenantId: string, id: string) {
        // Supabase will handle nullifying parent_id in children due to 'on delete set null'
        // But for products, we also have set null.
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    }

    // --- PRODUCTS ---

    async getProducts(tenantId: string, query?: any, page: number = 1, limit: number = 20) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Base Query
        let dbQuery = supabase
            .from('products')
            .select('*', { count: 'exact' });

        dbQuery = dbQuery.eq('tenant_id', tenantId);

        if (query?.category_id) {
            dbQuery = dbQuery.eq('category_id', query.category_id);
        }

        if (query?.product_type) {
            dbQuery = dbQuery.eq('product_type', query.product_type);
        }

        if (query?.search) {
            dbQuery = dbQuery.ilike('name', `%${query.search}%`);
        }

        // Add sorting and pagination
        dbQuery = dbQuery.order('created_at', { ascending: false }).range(from, to);

        const { data: products, error, count } = await dbQuery;
        if (error) throw error;

        // If branch_id provided, attach stock quantity
        // Note: For pagination + post-processing (stock map), we process only the page constraints.
        let resultProducts = products || [];

        // Stock Logic: Fetch ALL stocks for these products to calculate branch stock AND total stock
        if (resultProducts.length > 0) {
            const { data: stocks } = await supabase
                .from('stocks')
                .select('product_id, branch_id, quantity')
                .in('product_id', resultProducts.map(p => p.id));

            const branchId = query?.branch_id;

            resultProducts = resultProducts.map(p => {
                const productStocks = stocks?.filter(s => s.product_id === p.id) || [];

                // Calculate Total
                const totalStock = productStocks.reduce((sum, s) => sum + s.quantity, 0);

                // Calculate Branch Stock (if branch_id known)
                const branchStock = branchId
                    ? productStocks.find(s => s.branch_id === branchId)?.quantity || 0
                    : 0;

                return {
                    ...p,
                    stock: branchStock,        // For current branch
                    total_stock: totalStock,   // Global
                    quantity: branchStock      // Keep for backward compatibility if needed
                };
            });
        }

        return {
            data: resultProducts,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    }

    async getProduct(tenantId: string, id: string) {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) throw error;
        return data;
    }

    async createProduct(tenantId: string, input: any) {
        // Generate base slug
        let baseSlug = input.slug || input.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        let slug = baseSlug;

        // Ensure uniqueness loop
        let counter = 1;
        while (true) {
            const { data: existing } = await supabase
                .from('products')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('slug', slug)
                .single();

            if (!existing) break;

            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const { data, error } = await supabase
            .from('products')
            .insert({
                tenant_id: tenantId,
                category_id: input.category_id,
                name: input.name,
                slug: slug,
                sku: input.sku,
                description: input.description,
                price: input.price,
                cost_price: input.cost_price ?? 0,
                image_url: input.image_url,
                currency: input.currency ?? 'TRY',
                unit: input.unit ?? 'pcs',
                channels: input.channels ?? ['store'],
                is_active: input.is_active ?? true,
                product_type: input.product_type ?? 'product',
                pricing_model: input.pricing_model ?? 'standard'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateProduct(tenantId: string, id: string, input: any) {
        const { data, error } = await supabase
            .from('products')
            .update({
                category_id: input.category_id,
                name: input.name,
                sku: input.sku,
                description: input.description,
                price: input.price,
                currency: input.currency,
                unit: input.unit,
                channels: input.channels,
                is_active: input.is_active,
                cost_price: input.cost_price,
                image_url: input.image_url,
                product_type: input.product_type,
                pricing_model: input.pricing_model,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteProduct(tenantId: string, id: string) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    }
}

export const catalogService = new CatalogService();
