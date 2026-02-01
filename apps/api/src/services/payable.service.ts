import { supabase } from '../config/supabase';

export class PayableService {

    /**
     * Get Payable Stats
     */
    async getStats(tenantId: string) {
        // 1. Total Creditor Balances (Suppliers we owe)
        // In our logic, balance is generally Net. 
        // If Contact Balance > 0 -> Debit (They owe us).
        // If Contact Balance < 0 -> Credit (We owe them).
        const { data: creditors, error: creditError } = await supabase
            .from('contacts')
            .select('balance')
            .eq('tenant_id', tenantId)
            .lt('balance', 0);

        if (creditError) throw new Error(creditError.message);
        // Sum negative numbers, then absolute
        const totalCreditorDebt = Math.abs(creditors?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0);

        // 2. Outgoing Checks (Issued but not cleared)
        const { data: checks, error: checkError } = await supabase
            .from('checks')
            .select('amount')
            .eq('tenant_id', tenantId)
            .eq('direction', 'out')
            .in('status', ['pending', 'portfolio']); // 'portfolio' for out checks means 'issued/delivered'

        if (checkError) throw new Error(checkError.message);
        const totalChecks = checks?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

        // 3. Credit Card Debt (Negative Balances on CC Accounts)
        const { data: cards, error: cardError } = await supabase
            .from('finance_accounts')
            .select('balance')
            .eq('tenant_id', tenantId)
            .eq('type', 'credit_card')
            .lt('balance', 0);

        if (cardError) throw new Error(cardError.message);

        const totalCardDebt = Math.abs(cards?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0);

        return {
            totalPayable: totalCreditorDebt + totalChecks + totalCardDebt,
            currentAccountDebt: totalCreditorDebt,
            checksIssued: totalChecks,
            creditCardDebt: totalCardDebt
        };
    }

    /**
     * Get Creditors (Suppliers)
     */
    async getCreditors(tenantId: string, page = 1, limit = 20) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .lt('balance', 0)
            .order('balance', { ascending: true }) // Most negative first
            .range(from, to);

        if (error) throw new Error(error.message);
        return { data, meta: { total: count, page, limit } };
    }

    /**
     * Get Recurring Payments (Rent, Salaries)
     */
    async getRecurringPayments(tenantId: string) {
        const { data, error } = await supabase
            .from('finance_recurring')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId)
            .eq('active', true)
            .eq('type', 'expense');

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Create Recurring Payment Definition
     */
    async createRecurring(tenantId: string, input: any) {
        const { data, error } = await supabase
            .from('finance_recurring')
            .insert({ ...input, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Get Outgoing Checks
     */
    async getOutgoingChecks(tenantId: string) {
        const { data, error } = await supabase
            .from('checks')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId)
            .eq('direction', 'out')
            .order('due_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }
}

export const payableService = new PayableService();
