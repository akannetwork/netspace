import { supabase } from '../config/supabase';

export interface CreateOrderInput {
    slug: string;
    customer: {
        id?: string;
        name: string;
        email: string;
        phone?: string;
        address?: string;
    };
    items: {
        product_id: string;
        quantity: number;
    }[];
    channel?: 'store' | 'office' | 'market';
    branch_id?: string;
    payment_method?: string;
    payment_status?: string;
    payment_info?: {
        amount: number;
        method: 'cash' | 'bank' | 'check';
        account_id?: string;
        check_info?: {
            bank_name: string;
            check_number: string;
            due_date: string;
        };
    };
    status?: string;
}

export class OrderService {

    /**
     * Public: Create a new order (Checkout)
     */
    async createOrder(input: CreateOrderInput) {
        // 1. Resolve Tenant by Slug
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', input.slug)
            .single();

        if (!tenant) throw new Error('Tenant not found');

        // 2. Validate Items & Calculate Total
        let totalAmount = 0;
        const orderItemsPayload = [];

        for (const item of input.items) {
            const { data: product } = await supabase
                .from('products')
                .select('id, name, price, currency')
                .eq('id', item.product_id)
                .eq('tenant_id', tenant.id)
                .single();

            if (!product) throw new Error(`Product ${item.product_id} not found`);

            const lineTotal = product.price * item.quantity;
            totalAmount += lineTotal;

            orderItemsPayload.push({
                product_id: product.id,
                title: product.name,
                price: product.price,
                quantity: item.quantity
            });
        }

        // 3. Resolve Branch (If missing, find HQ)
        let targetBranchId = input.branch_id;
        if (!targetBranchId) {
            console.log(`[OrderService] Branch ID missing for Web Order. Searching for HQ for tenant ${tenant.id}...`);
            const { data: hqBranch, error: hqError } = await supabase
                .from('branches')
                .select('id, type, is_main')
                .eq('tenant_id', tenant.id)
                .or('type.eq.hq,type.eq.headquarters,is_main.eq.true') // Look for 'hq', 'headquarters' or Main
                .limit(1)
                .single();

            if (hqError) console.error('[OrderService] HQ Search Error:', hqError);
            console.log('[OrderService] HQ Branch Search Result:', hqBranch);

            if (hqBranch) {
                targetBranchId = hqBranch.id;
            } else {
                console.warn('[OrderService] WARNING: No HQ/Main branch found! Order will be branchless.');
            }
        }

        // 3a. Resolve or Create Contact (Auto-Link)
        let resolvedContactId: string | null = null;
        if (input.customer && input.customer.phone && input.customer.name) {
            const phone = input.customer.phone;

            // Search existing contact in this tenant
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('tenant_id', tenant.id)
                .eq('phone', phone)
                .single();

            if (existingContact) {
                resolvedContactId = existingContact.id;
            } else {
                // Create new Customer Contact
                const { data: newContact, error: createContactError } = await supabase
                    .from('contacts')
                    .insert({
                        tenant_id: tenant.id,
                        type: 'customer',
                        name: input.customer.name,
                        phone: phone,
                        email: input.customer.email || '',
                        address: input.customer.address ? { address: input.customer.address } : {}
                    })
                    .select()
                    .single();

                if (!createContactError && newContact) {
                    resolvedContactId = newContact.id;
                } else {
                    console.error('[OrderService] Failed to auto-create contact:', createContactError);
                }
            }
        }

        // 4. Create Order via RPC (Atomic Transaction)
        // Generate simple Order Number (Timestamp + Random)
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        const { data: order, error: orderError } = await supabase
            .rpc('create_order', {
                p_tenant_id: tenant.id,
                p_order_number: orderNumber,
                p_customer_name: input.customer.name,
                p_customer_email: input.customer.email,
                p_customer_phone: input.customer.phone || '',
                p_shipping_address: input.customer.address,
                p_total_amount: totalAmount,
                p_channel: input.channel || 'web',
                p_items: orderItemsPayload,
                p_branch_id: targetBranchId || null,
                p_payment_method: null,
                p_payment_status: 'pending',
                p_status: 'new',
                p_currency: 'TRY'
            });

        // PATCH: Explicitly enforce branch_id and Link Contact in case RPC ignored it
        if ((targetBranchId || resolvedContactId) && order) {
            const updates: any = {};
            if (targetBranchId) updates.branch_id = targetBranchId;
            if (resolvedContactId) updates.contact_id = resolvedContactId;

            await supabase.from('orders')
                .update(updates)
                .eq('id', (order as any).id);
        }

        // 5. Create Transaction & Update Balance (Debt)
        // If payment is pending, this creates a receivable (Debit to Customer)
        if (resolvedContactId && order) {
            const transactionPayload = {
                tenant_id: tenant.id,
                contact_id: resolvedContactId,
                type: 'debit', // Customer owes us
                category: 'sale',
                amount: totalAmount,
                order_id: (order as any).id,
                description: `Order #${orderNumber}`,
                created_at: new Date().toISOString()
            };

            const { error: trxError } = await supabase.from('transactions').insert(transactionPayload);
            if (trxError) console.error('[OrderService] Failed to create transaction:', trxError);
            else {
                // Update Contact Balance (DEBIT)
                const { error: rpcError } = await supabase.rpc('increment_contact_balance', {
                    p_contact_id: resolvedContactId,
                    p_amount: totalAmount
                });

                if (rpcError) {
                    console.warn('[OrderService] RPC increment_contact_balance failed (likely missing), falling back to manual update.', rpcError);

                    // Fallback: Read-Modify-Write
                    const { data: cData } = await supabase.from('contacts').select('balance').eq('id', resolvedContactId).single();
                    if (cData) {
                        const currentBalance = Number(cData.balance || 0);
                        const safeAmount = Number(totalAmount);
                        const newBalance = currentBalance + safeAmount;

                        await supabase
                            .from('contacts')
                            .update({ balance: newBalance })
                            .eq('id', resolvedContactId);
                    }
                }
            }

            // 6. Process Payment (If any)
            if (input.payment_info) {
                console.log('[OrderService] Processing Immediate Payment:', JSON.stringify(input.payment_info, null, 2));
                try {
                    const { contactService } = await import('./contact.service');

                    await contactService.addTransaction(tenant.id, {
                        contact_id: resolvedContactId,
                        type: 'credit', // Payment / Collection
                        category: 'collection',
                        amount: input.payment_info.amount,
                        description: `Payment for Order #${orderNumber}`,
                        order_id: (order as any).id,
                        account_id: input.payment_info.account_id,
                        check_info: input.payment_info.check_info
                    });

                    console.log('[OrderService] Payment Auto-Processed.');
                } catch (payErr) {
                    console.error('[OrderService] Failed to process immediate payment:', payErr);
                    // Don't fail the order, just log.
                }
            } else {
                // No payment, status is pending (default)
            }
        }

        if (orderError) {
            // Handle specific errors like "Stock insufficient"
            if (orderError.message.includes('Stock insufficient')) {
                throw new Error(orderError.message); // Pass friendly message
            }
            throw new Error('Order creation failed: ' + orderError.message);
        }

        return order;
    }

    /**
     * Office: Create Order (POS / Manual)
     * Uses authenticated tenantId directly.
     */
    async createInternalOrder(tenantId: string, input: Omit<CreateOrderInput, 'slug'>) {
        console.log(`[OrderService] createInternalOrder for tenant: ${tenantId}`, JSON.stringify(input, null, 2));

        // 1. Validate Items & Calculate Total
        let totalAmount = 0;
        const orderItemsPayload = [];

        for (const item of input.items) {
            const { data: product } = await supabase
                .from('products')
                .select('id, name, price, currency')
                .eq('id', item.product_id)
                .eq('tenant_id', tenantId)
                .single();

            if (!product) throw new Error(`Product ${item.product_id} not found`);

            const lineTotal = product.price * item.quantity;
            totalAmount += lineTotal;

            orderItemsPayload.push({
                product_id: product.id,
                title: product.name,
                price: product.price,
                quantity: item.quantity
            });
        }

        // 2. Generate Order Number
        const orderNumber = `POS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

        // 3. Create Order via RPC
        const { data: order, error: orderError } = await supabase
            .rpc('create_order', {
                p_tenant_id: tenantId,
                p_order_number: orderNumber,
                p_customer_name: input.customer.name,
                p_customer_email: input.customer.email,
                p_customer_phone: input.customer.phone || '',
                p_shipping_address: input.customer.address || 'Ofis Satışı',
                p_total_amount: totalAmount,
                p_channel: input.channel || 'store',
                p_items: orderItemsPayload,
                p_branch_id: input.branch_id || null,
                p_payment_method: input.payment_method || null,
                p_payment_status: input.payment_status || 'pending',
                p_status: input.status || 'new',
                p_currency: 'TRY'
            });

        if (orderError) {
            if (orderError.message.includes('Stock insufficient')) {
                throw new Error(orderError.message);
            }
            throw new Error('Order creation failed: ' + orderError.message);
        }

        // PATCH: Explicitly enforce branch_id in case RPC ignored it
        if (input.branch_id || (input.customer && input.customer.id)) {
            const updates: any = {};
            if (input.branch_id) updates.branch_id = input.branch_id;
            if (input.customer && input.customer.id) updates.contact_id = input.customer.id;
            if (input.status) {
                console.log('[OrderService] Overriding status to:', input.status);
                updates.status = input.status;
            }

            // Only update if we have keys
            if (Object.keys(updates).length > 0) {
                const { error: patchError } = await supabase.from('orders')
                    .update(updates)
                    .eq('id', (order as any).id);

                if (patchError) console.error('[OrderService] Failed to patch order:', patchError);
            }
        }



        // 4. Create Transaction & Update Balance (Debt)
        // If payment is pending, this creates a receivable (Debit to Customer)
        let resolvedContactId = input.customer?.id;

        // If contact ID wasn't provided in input but created inside RPC (unlikely for internal order without return),
        // we should check (order as any).contact_id if returned. 
        // Note: RPC create_order resolves contact internally if passing phone, but for Internal Order we usually pass contact_id directly?
        // Checking input.customer.id:

        // Wait, input.customer has id if selected from existing contacts.
        if (!resolvedContactId && (order as any).contact_id) {
            resolvedContactId = (order as any).contact_id;
        }

        // =====================================================================
        // TRANSACTION HANDLING NOTE:
        // =====================================================================
        // Debit/Credit transactions are handled by the FRONTEND (POSModal.tsx/CreateOrderModal.tsx)
        // after order creation. We only create the order here.
        // 
        // POSModal.tsx flow:
        // 1. POST /office/orders (this method)
        // 2. POST /office/contacts/transactions (debit - customer owes us)
        // 3. POST /office/contacts/transactions (credit - if payment received)
        //
        // DO NOT create transactions here to avoid duplication.

        console.log('INTERNAL ORDER CREATED:', order);
        return order;
    }

    /**
     * Office: Get Tenant Orders
     */
    async getOrders(tenantId: string, page: number = 1, limit: number = 20, branchId?: string, isHQOverride: boolean = false, contactId?: string, paymentStatus?: string) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Get Total Count
        // Check if filter branch is HQ
        let isHQ = isHQOverride;

        // Override from explicit parameter (Frontend is smarter)
        // Note: Logic inside office.routes.ts will pass this from query string
        // We modify signature below to accept it.
        // But first, let's look at signature line 188.
        if (branchId) {
            const { data: branch } = await supabase
                .from('branches')
                .select('type, is_main')
                .eq('id', branchId)
                .single();

            if (branch) {
                const bType = (branch.type || '').toLowerCase();
                if (bType === 'headquarters' || bType === 'hq' || branch.is_main) {
                    isHQ = true;
                }
            }
            console.log(`[OrderService] getOrders Filter - BranchID: ${branchId}, Type: ${branch?.type}, IsMain: ${branch?.is_main} => isHQ: ${isHQ}`);
        }

        let countQuery = supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        if (branchId && !isHQ) {
            // Apply filter only if NOT HQ (Store/Warehouse)
            // HQ sees ALL orders (Tenant-wide)
            countQuery = countQuery.eq('branch_id', branchId);
        }

        // Apply contact filter
        if (contactId) {
            countQuery = countQuery.eq('contact_id', contactId);
        }

        // Apply payment status filter
        if (paymentStatus) {
            countQuery = countQuery.eq('payment_status', paymentStatus);
        }

        const { count, error: countError } = await countQuery;

        if (countError) throw countError;

        // Get Data
        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                branches (name)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (branchId && !isHQ) {
            query = query.eq('branch_id', branchId);
        } else if (branchId && isHQ) {
            // For HQ View: Show unassigned OR specifically assigned to HQ
            // For now, HQ sees everything for oversight, but let's keep it simple:
            // If isHQ is true, we don't apply branch filter to show ALL (including branchless)
        }

        // Apply contact filter
        if (contactId) {
            query = query.eq('contact_id', contactId);
        }

        // Apply payment status filter
        if (paymentStatus) {
            query = query.eq('payment_status', paymentStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[OrderService] getOrders Error:', error);
            throw error;
        }

        console.log(`[OrderService] getOrders Params included - Tenant: ${tenantId}, Branch: ${branchId}, isHQ: ${isHQ}`);
        if (data && data.length > 0) {
            console.log(`[OrderService] Fetched IDs (${data.length}):`, data.map((o: any) => o.id));
        } else {
            console.log('[OrderService] No orders fetched.');
        }

        console.log(`[OrderService] getOrders fetched ${data?.length} orders for tenant ${tenantId}. Total: ${count}. isHQ: ${isHQ}`);

        return {
            data: data.map((order: any) => ({
                ...order,
                branch_name: order.branches?.name
            })),
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    }

    /**
     * Office: Get Single Order
     */
    async getOrder(tenantId: string, orderId: string) {
        console.log(`[OrderService] getOrder accessing: tenant=${tenantId}, order=${orderId}`);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                branches (name)
            `)
            .eq('id', orderId)
            .eq('tenant_id', tenantId)
            .single();

        if (error) {
            console.error('[OrderService] Supabase Error:', error);
            throw error;
        }
        return {
            ...data,
            branch_name: data.branches?.name
        };
    }

    /**
     * Office: Update Order Status
     */
    async updateStatus(tenantId: string, orderId: string, status: string) {
        // Special logic for Cancellation (Restock)
        if (status === 'cancelled') {
            const { data, error } = await supabase.rpc('cancel_order', {
                p_tenant_id: tenantId,
                p_order_id: orderId
            });

            if (error) throw new Error(error.message);

            console.log('Cancel Order RPC Result:', JSON.stringify(data, null, 2));

            // Fetch updated order to return consistent response
            const { data: updatedOrder } = await supabase
                .from('orders')
                .select()
                .eq('id', orderId)
                .single();

            return updatedOrder;
        }

        // Standard Status Update
        const { data, error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const orderService = new OrderService();
