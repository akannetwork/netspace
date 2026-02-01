import { supabase } from '../config/supabase';

export class ReceivableService {

    /**
     * Get Overview Stats
     */
    async getStats(tenantId: string) {
        // 1. Total Contact Balances (Debtors)
        const { data: debtors, error: debtError } = await supabase
            .from('contacts')
            .select('balance')
            .eq('tenant_id', tenantId)
            .gt('balance', 0); // Assuming Positive = They Owe Us (Debit Balance)

        if (debtError) throw new Error(debtError.message);
        const totalDebt = debtors?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;

        // 2. Checks in Portfolio
        const { data: checks, error: checkError } = await supabase
            .from('checks')
            .select('amount')
            .eq('tenant_id', tenantId)
            .eq('direction', 'in')
            .in('status', ['pending', 'portfolio']);

        if (checkError) throw new Error(checkError.message);
        const totalChecks = checks?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

        return {
            totalReceivable: totalDebt + totalChecks,
            currentAccountDebt: totalDebt,
            checkPortfolio: totalChecks,
            // overdue? requires comparing ledger/installments dates. Too complex for simple stat for now.
        };
    }

    /**
     * Get Debtors (Cari Alacaklar)
     */
    async getDebtors(tenantId: string, page = 1, limit = 20) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .gt('balance', 0)
            .order('balance', { ascending: false })
            .range(from, to);

        if (error) throw new Error(error.message);
        return { data, meta: { total: count, page, limit } };
    }

    /**
     * Get Upcoming Installments
     */
    async getUpcomingInstallments(tenantId: string, limit = 10) {
        const { data, error } = await supabase
            .from('finance_installments')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId)
            .eq('type', 'receivable')
            .in('status', ['pending', 'partial', 'overdue'])
            .order('due_date', { ascending: true })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Get Check Portfolio
     */
    async getPortfolioChecks(tenantId: string) {
        const { data, error } = await supabase
            .from('checks')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId)
            .eq('direction', 'in')
            .in('status', ['pending', 'portfolio'])
            .order('due_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Create Installments (Bulk) - Used by POS
     */
    async createInstallments(tenantId: string, installments: any[]) {
        const { data, error } = await supabase
            .from('finance_installments')
            .insert(installments.map(i => ({ ...i, tenant_id: tenantId })))
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Pay an installment (Full or Partial)
     */
    async payInstallment(tenantId: string, input: {
        installment_id: string;
        amount: number;
        payment_method: 'cash' | 'credit_card' | 'check' | 'eft';
        account_id?: string;
        check_info?: { bank_name: string; check_number: string; due_date: string };
        description?: string;
    }) {
        console.log('[ReceivableService] payInstallment:', input);

        // 1. Get the installment
        const { data: installment, error: fetchError } = await supabase
            .from('finance_installments')
            .select('*, contacts(id, name, balance)')
            .eq('id', input.installment_id)
            .eq('tenant_id', tenantId)
            .single();

        if (fetchError || !installment) {
            throw new Error('Taksit bulunamadı');
        }

        const paymentAmount = Number(input.amount);
        const remainingBefore = Number(installment.remaining_amount);

        if (paymentAmount <= 0) {
            throw new Error('Ödeme tutarı 0\'dan büyük olmalı');
        }

        if (paymentAmount > remainingBefore) {
            throw new Error(`Ödeme tutarı kalan tutardan büyük olamaz (Kalan: ${remainingBefore})`);
        }

        // 2. Create Credit Transaction (Reduces Contact Balance)
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                tenant_id: tenantId,
                contact_id: installment.contact_id,
                type: 'credit',
                category: 'collection',
                amount: paymentAmount,
                description: input.description || `Taksit Ödemesi`,
                order_id: installment.order_id
            });

        if (txError) {
            console.error('[ReceivableService] Transaction Error:', txError);
            throw new Error('İşlem kaydedilemedi: ' + txError.message);
        }

        // 3. Update Contact Balance
        const contact = installment.contacts;
        if (contact) {
            const newBalance = Number(contact.balance || 0) - paymentAmount;
            await supabase
                .from('contacts')
                .update({ balance: newBalance })
                .eq('id', contact.id);
            console.log(`[ReceivableService] Balance updated: ${contact.balance} -> ${newBalance}`);
        }

        // 4. Update Installment
        const newRemaining = remainingBefore - paymentAmount;
        const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

        console.log(`[ReceivableService] Updating installment ${input.installment_id}: remaining=${newRemaining}, status=${newStatus}`);

        const { data: updatedInstallment, error: updateError } = await supabase
            .from('finance_installments')
            .update({
                remaining_amount: newRemaining,
                status: newStatus
            })
            .eq('id', input.installment_id)
            .select()
            .single();

        console.log('[ReceivableService] Update result:', { updatedInstallment, updateError });


        if (updateError) {
            console.error('[ReceivableService] Installment Update Error:', updateError);
            throw new Error('Taksit güncellenemedi');
        }

        // 5. Handle Check Payment (if applicable)
        if (input.payment_method === 'check' && input.check_info) {
            const { error: checkError } = await supabase
                .from('checks')
                .insert({
                    tenant_id: tenantId,
                    contact_id: installment.contact_id,
                    amount: paymentAmount,
                    due_date: input.check_info.due_date,
                    bank_name: input.check_info.bank_name,
                    check_number: input.check_info.check_number,
                    direction: 'in',
                    status: 'portfolio',
                    notes: input.description || 'Taksit Ödemesi'
                });

            if (checkError) {
                console.error('[ReceivableService] Check Insert Error:', checkError);
            }
        }

        // 6. Handle Finance Account (Cash/Card/EFT)
        if (input.account_id && input.payment_method !== 'check') {
            try {
                const { financeService } = await import('./finance.service');
                await financeService.createTransaction(tenantId, {
                    account_id: input.account_id,
                    type: 'income',
                    amount: paymentAmount,
                    description: input.description || 'Taksit Tahsilatı',
                    contact_id: installment.contact_id
                });
            } catch (finError) {
                console.error('[ReceivableService] Finance Error:', finError);
            }
        }

        console.log('[ReceivableService] Installment paid successfully:', updatedInstallment);
        return updatedInstallment;
    }
}

export const receivableService = new ReceivableService();
