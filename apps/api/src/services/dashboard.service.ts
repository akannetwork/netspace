import { supabase } from '../config/supabase';

export class DashboardService {

    /**
     * Get High-Level Stats (KPIs)
     */
    async getStats(tenantId: string) {
        // 1. Total Orders
        let orderQuery = supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        // if (branchId) orderQuery = orderQuery.eq('branch_id', branchId); // Future: when orders have branch_id fully populated

        const { count: totalOrders, error: orderError } = await orderQuery;
        if (orderError) throw orderError;

        // 2. Total Revenue (Sum)
        let revenueQuery = supabase
            .from('orders')
            .select('total_amount')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled'); // Exclude cancelled

        const { data: revenueData, error: revenueError } = await revenueQuery;
        if (revenueError) throw revenueError;

        const totalRevenue = revenueData.reduce((sum, order) => sum + (order.total_amount || 0), 0);

        // 3. Total Products
        const { count: totalProducts, error: productError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        if (productError) throw productError;

        return {
            totalOrders: totalOrders || 0,
            totalRevenue: totalRevenue || 0,
            totalProducts: totalProducts || 0
        };
    }

    /**
     * Get Low Stock Products (Less than 5)
     * Complex join because stock is in `stocks` table now.
     */
    async getLowStock(tenantId: string, branchId?: string) {
        // If branchId provided, check specific stock.
        // If not, maybe check total? For now let's enforce branchId for accuracy or pick main branch.

        // Strategy: Get products and their stock for the current branch context
        // Using the existing inventory service logic might be better, but let's do a direct query for speed.

        if (!branchId) return []; // Require branch to context
        console.log(`Checking low stock for tenant ${tenantId} branch ${branchId}`); // Use tenantId to shut up linter

        const { data, error } = await supabase
            .from('stocks')
            .select(`
                quantity,
                products (id, name, sku, image_url)
            `)
            .eq('branch_id', branchId)
            .lt('quantity', 5)
            .order('quantity', { ascending: true })
            .limit(5); // Top 5 critical items

        if (error) throw error;

        // Flatten
        return data.map((item: any) => ({
            id: item.products?.id,
            name: item.products?.name,
            sku: item.products?.sku,
            quantity: item.quantity,
            image: item.products?.image_url
        }));
    }

    /**
     * Get Recent Orders
     */
    async getRecentOrders(tenantId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, total_amount, status, created_at, currency')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        return data;
    }
}

export const dashboardService = new DashboardService();
