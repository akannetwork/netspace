import { supabase } from '../config/supabase';

export interface CreateContactInput {
    type: 'customer' | 'supplier' | 'subcontractor' | 'personnel';
    name: string;
    email?: string;
    phone?: string;
    tax_id?: string;
    address?: any;
    // HR Fields
    salary_type?: 'monthly' | 'daily' | 'hybrid';
    base_salary?: number;
    daily_rate?: number;
    portal_access?: boolean;
}

export interface CreateTransactionInput {
    contact_id?: string;
    personnel_id?: string;
    type: 'debit' | 'credit';
    category: 'sale' | 'purchase' | 'payment' | 'collection' | 'opening_balance' | 'adjustment';
    amount: number;
    description?: string;
    reference_id?: string;
    order_id?: string; // Link payment to order
    account_id?: string; // For Finance Integration (Safe/Bank)
    check_info?: {
        check_number: string;
        bank_name: string;
        due_date: string;
    };
}

export class ContactService {

    // ... (getContacts, getContact, createContact, getTransactions, getPendingOrders, getTransactionsByPersonnelId methods remain unchanged) ...

    /**
     * Cari Kart Listesi
     */
    async getContacts(tenantId: string, type?: string, page: number = 1, limit: number = 20, search?: string) {
        console.log(`[ContactService] getting contacts for tenant: ${tenantId}, type: ${type}, page: ${page}, limit: ${limit}, search: ${search}`);

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('contacts')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .order('name')
            .range(from, to);

        if (type) {
            query = query.eq('type', type);
        }

        if (search && search.length > 0) {
            // Using raw string for OR filter with ilike
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, count, error } = await query;
        if (error) {
            console.error('[ContactService] getContacts error:', error);
            throw error;
        }

        console.log(`[ContactService] Query Result: Count=${count}, DataLength=${data?.length}, Tenant=${tenantId}, Type=${type}`);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        console.log(`[ContactService] found ${data?.length} contacts (Total: ${total})`);

        return {
            data: data || [],
            meta: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }

    /**
     * Tekil Cari Kart Detayı
     */
    async getContact(tenantId: string, id: string) {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Personel bulunamadı');
        return data;
    }

    /**
     * Yeni Cari Kart Oluşturma
     */
    async createContact(tenantId: string, input: CreateContactInput & { personnel_id?: string }) {
        console.log(`[ContactService] Creating contact for tenant ${tenantId}`, input);

        // 1. Check Duplicate Phone
        if (input.phone) {
            const { data: existing } = await supabase
                .from('contacts')
                .select('id, name, type')
                .eq('tenant_id', tenantId)
                .eq('phone', input.phone)
                .single();

            if (existing) {
                console.warn(`[ContactService] Duplicate phone found: ${input.phone}`);
                throw new Error(`This phone number is already registered to: ${existing.name} (${existing.type})`);
            }
        }

        // 2. Create
        const { data, error } = await supabase
            .from('contacts')
            .insert({
                tenant_id: tenantId,
                ...input,
                balance: 0
            })
            .select()
            .single();

        if (error) {
            console.error('[ContactService] Insert Error:', error);
            throw error;
        }

        console.log('[ContactService] Created successfully:', data);
        return data;
    }

    /**
     * Cari Hareketleri (Extre)
     */
    async getTransactions(tenantId: string, contactId: string) {
        console.log(`[ContactService] getTransactions: Tenant=${tenantId}, Contact=${contactId}`);
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ContactService] getTransactions Error:', error);
            throw error;
        }
        console.log(`[ContactService] getTransactions Found: ${data?.length} records`);
        return data;
    }

    /**
     * Bekleyen Siparişleri Getir (Tahsilat için)
     */
    async getPendingOrders(tenantId: string, contactId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, total_amount, payment_status, created_at, currency')
            .eq('tenant_id', tenantId)
            .eq('contact_id', contactId)
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get Transactions
     */
    async getTransactionsByPersonnelId(tenantId: string, personnelId: string, page: number = 1, limit: number = 20) {
        try {
            console.log(`[ContactService] getTransactionsByPersonnelId START: Tenant=${tenantId}, ID=${personnelId}`);

            // Reuse the working 'getTransactions' logic to ensure consistency
            const allData = await this.getTransactions(tenantId, personnelId);

            console.log(`[ContactService] getTransactionsByPersonnelId: Retrieved ${allData?.length} records`);

            const total = allData?.length || 0;
            const totalPages = Math.ceil(total / limit);

            const from = (page - 1) * limit;
            const to = from + limit;
            const slicedData = allData?.slice(from, to) || [];

            return {
                data: slicedData,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages
                }
            };
        } catch (err: any) {
            console.error('[ContactService] getTransactionsByPersonnelId FATAL ERROR:', err);
            // Return empty structure to prevent UI crash
            return {
                data: [],
                meta: { total: 0, page, limit, totalPages: 0 }
            };
        }
    }

    /**
     * Yeni Hareket Ekleme (Manuel İşlem)
     */
    async addTransaction(tenantId: string, input: CreateTransactionInput) {
        console.log(`[ContactService] addTransaction for tenant ${tenantId}:`, input);

        // Map personnel_id to contact_id for backward compatibility
        const contactId = input.contact_id || input.personnel_id;
        if (!contactId) throw new Error('Contact ID or Personnel ID is required');

        // 1. Hareketi kaydet
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                tenant_id: tenantId,
                contact_id: contactId, // Unified ID
                type: input.type,
                category: input.category,
                amount: input.amount,
                description: input.description,
                reference_id: input.reference_id,
                order_id: input.order_id
            })
            .select()
            .single();

        if (error) {
            console.error('[ContactService] Insert Error:', error);
            throw error;
        }

        // 1.5. Financial Integration
        console.log('[ContactService] Financial Integration - check_info:', input.check_info, 'account_id:', input.account_id);

        // Scenario A: Cheque Payment -> Insert to Portfolio
        if (input.check_info) {
            console.log('[ContactService] Processing Cheque Payment:', JSON.stringify(input.check_info));
            const checkPayload = {
                tenant_id: tenantId,
                contact_id: contactId,
                amount: input.amount,
                due_date: input.check_info.due_date,
                bank_name: input.check_info.bank_name,
                check_number: input.check_info.check_number,
                direction: 'in', // Received Check
                status: 'portfolio',
                notes: input.description
            };
            console.log('[ContactService] Check Payload:', JSON.stringify(checkPayload));

            const { data: checkData, error: checkError } = await supabase
                .from('checks')
                .insert(checkPayload)
                .select();

            if (checkError) {
                console.error('[ContactService] Cheque Insert Failed:', checkError);
                throw new Error('Failed to record cheque: ' + checkError.message);
            } else {
                console.log('[ContactService] Cheque Inserted Successfully:', checkData);
            }
        }
        // Scenario B: Cash/Bank Payment -> Update Finance Account
        else if (input.account_id) {
            console.log('[ContactService] Linking Finance Account:', input.account_id);
            try {
                const { financeService } = await import('./finance.service');

                // Map Contact Transaction Type to Finance Type
                // Contact Credit (Collection) -> Money IN (Income)
                // Contact Debit (Payment) -> Money OUT (Expense)
                const financeType = input.type === 'credit' ? 'income' : 'expense';
                console.log(`[ContactService] Creating Finance Transaction. Type: ${financeType}, Amount: ${input.amount}`);

                await financeService.createTransaction(tenantId, {
                    account_id: input.account_id,
                    type: financeType,
                    amount: input.amount,
                    description: `${input.description || 'Cari İşlem'} (${contactId})`,
                    contact_id: contactId,
                    date: new Date().toISOString()
                });
                console.log('[ContactService] Finance Transaction Created Successfully');
            } catch (finError) {
                console.error('[ContactService] Finance Integration Failed:', finError);
                // Don't throw
            }
        }

        // 2. Bakiyeyi güncelle (Unified Logic)
        const { data: contact } = await supabase
            .from('contacts')
            .select('balance, type')
            .eq('id', contactId)
            .single();

        if (contact) {
            let newBalance = Number(contact.balance || 0);
            const amount = Number(input.amount);

            // =====================================================================
            // BALANCE CALCULATION LOGIC (UNIFIED for ALL contact types)
            // =====================================================================
            //
            // Simple and consistent logic:
            // - Debit (Satış/Borçlandırma) -> +Balance (They owe us more)
            // - Credit (Tahsilat/Ödeme) -> -Balance (They owe us less)
            //
            // Examples:
            // - Customer Sale 1000 TL (debit) -> Balance = +1000 (BORÇLU)
            // - Customer Payment 500 TL (credit) -> Balance = +500 (BORÇLU)
            // - Personnel Sale 1000 TL (debit) -> Balance = +1000 (BORÇLU)
            // - Personnel Salary 2000 TL (credit) -> Balance = -1000 (ALACAKLI)
            //
            // Positive Balance = BORÇLU (they owe us)
            // Negative Balance = ALACAKLI (we owe them)

            if (input.type === 'debit') {
                newBalance += amount;
            } else {
                newBalance -= amount;
            }

            console.log(`[ContactService] Balance Update: Type=${contact.type}, TxType=${input.type}, Amount=${amount}, OldBalance=${contact.balance}, NewBalance=${newBalance}`);

            await supabase
                .from('contacts')
                .update({ balance: newBalance, updated_at: new Date().toISOString() })
                .eq('id', contactId);
        }

        // 3. Sipariş Durumu Güncelleme (Sadece Tahsilatlarda / Credit)
        if (input.order_id && transaction && input.type === 'credit') {
            await this.updateOrderPaymentStatus(tenantId, input.order_id);
        }

        return transaction;
    }

    /**
     * Sipariş Ödeme Durumunu Güncelle
     */
    async updateOrderPaymentStatus(_tenantId: string, orderId: string) {
        // 1. Sipariş detayını al
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('Order not found for status update:', orderId);
            return;
        }

        // 2. Bu siparişe ait TOPLAM ÖDEME'yi bul (Credit transactions linked to order)
        const { data: payments, error: paymentError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('order_id', orderId)
            .eq('type', 'credit'); // Only Payments

        if (paymentError) {
            console.error('Failed to fetch payments for order:', orderId);
            return;
        }

        const totalPaid = payments?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalAmount = Number(order.total_amount);

        let newStatus = 'pending';
        // Allow slightly less due to rounding or precise
        if (totalPaid >= totalAmount - 0.01) {
            newStatus = 'paid';
        } else if (totalPaid > 0) {
            newStatus = 'partial';
        }

        console.log(`[ContactService] Order ${orderId}: Total=${totalAmount}, Paid=${totalPaid}, Status=${newStatus}`);

        // 3. Durumu güncelle
        await supabase
            .from('orders')
            .update({ payment_status: newStatus })
            .eq('id', orderId);
    }
}

export const contactService = new ContactService();
