import { supabase } from '../config/supabase';

export interface CreateAccountInput {
    name: string;
    type: 'cash' | 'bank' | 'pos' | 'check_account' | 'credit_card';
    currency?: string;
    branch_id?: string; // Optional (if null, global account)
}

export interface CreateTransactionInput {
    account_id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
    amount: number;
    description?: string;
    contact_id?: string;
    order_id?: string;
    related_transaction_id?: string;
    date?: string;
}

export class FinanceService {

    /**
     * Get Accounts for a specific branch (and global accounts)
     */
    async getAccounts(tenantId: string, branchId?: string) {
        let query = supabase
            .from('finance_accounts')
            .select('*')
            .eq('tenant_id', tenantId);

        // Logic: Show Global Accounts (branch_id is null) AND Branch Specific Accounts
        if (branchId) {
            query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
        } else {
            // If viewing as HQ/Admin (no branch filter), show all?
            // Or just global? Let's show all for HQ usually.
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Create a new Account (Kasa, Banka, etc.)
     */
    async createAccount(tenantId: string, input: CreateAccountInput) {
        console.log('[FinanceService] Creating Account:', { tenantId, ...input });
        const { data, error } = await supabase
            .from('finance_accounts')
            .insert({
                tenant_id: tenantId,
                ...input
            })
            .select()
            .single();

        console.log('[FinanceService] Supabase Response:', { data, error });

        if (error) {
            console.error('[FinanceService] Insert Error:', error);
            throw new Error(error.message);
        }
        return data;
    }

    /**
     * Delete an account
     */
    async deleteAccount(tenantId: string, accountId: string) {
        const { error } = await supabase
            .from('finance_accounts')
            .delete()
            .eq('id', accountId)
            .eq('tenant_id', tenantId);

        if (error) throw new Error(error.message);
        return true;
    }

    /**
     * Get Ledger (Transactions) for an account
     */
    async getTransactions(tenantId: string, accountId: string, page: number = 1, limit: number = 20) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('finance_transactions')
            .select('*, contacts(name)', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('account_id', accountId)
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw new Error(error.message);
        return { data, meta: { total: count, page, limit } };
    }

    /**
     * Create a basic transaction (Income/Expense/Transfer)
     * NOTE: This does NOT automatically update account balance. 
     * We should ideally use a DB Trigger for that, or update manually here.
     * implementing manual update for now for control.
     */
    async createTransaction(tenantId: string, input: CreateTransactionInput) {
        console.log('[FinanceService] createTransaction called:', JSON.stringify(input, null, 2));
        // 1. Create Transaction Record
        const { data: trx, error } = await supabase
            .from('finance_transactions')
            .insert({
                tenant_id: tenantId,
                ...input
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 2. Update Account Balance
        // Income/Transfer_In = +
        // Expense/Transfer_Out = -
        const isPositive = input.type === 'income' || input.type === 'transfer_in';
        const balanceChange = isPositive ? input.amount : -input.amount;

        await this.updateAccountBalance(input.account_id, balanceChange);

        return trx;
    }

    /**
     * Transfer between accounts
     */
    async transfer(tenantId: string, fromAccountId: string, toAccountId: string, amount: number, description: string) {
        // 1. Create OUT transaction
        const outTrx = await this.createTransaction(tenantId, {
            account_id: fromAccountId,
            type: 'transfer_out',
            amount: amount,
            description: description || 'Transfer Out'
        });

        // 2. Create IN transaction (linked)
        await this.createTransaction(tenantId, {
            account_id: toAccountId,
            type: 'transfer_in',
            amount: amount,
            description: description || 'Transfer In',
            related_transaction_id: outTrx.id
        });

        return { success: true };
    }

    /**
     * Helper: Update Account Balance
     */
    private async updateAccountBalance(accountId: string, amount: number) {
        // We really should use an RPC for atomicity, but for MVP:
        const { data: account } = await supabase
            .from('finance_accounts')
            .select('balance')
            .eq('id', accountId)
            .single();

        if (account) {
            const newBalance = (account.balance || 0) + amount;
            await supabase
                .from('finance_accounts')
                .update({ balance: newBalance })
                .eq('id', accountId);
        }
    }

    /**
     * Checks Management
     */
    async getChecks(tenantId: string, status?: string) {
        let query = supabase
            .from('checks')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId);

        if (status) {
            if (status.includes(',')) {
                query = query.in('status', status.split(','));
            } else {
                query = query.eq('status', status);
            }
        }

        const { data, error } = await query.order('due_date', { ascending: true });
        if (error) throw new Error(error.message);
        return data;
    }

    async createCheck(tenantId: string, input: any) {
        console.log('[FinanceService] createCheck:', input);

        const { data, error } = await supabase
            .from('checks')
            .insert({ tenant_id: tenantId, ...input })
            .select()
            .single();

        if (error) {
            console.error('[FinanceService] createCheck Error:', error);
            throw new Error(error.message);
        }

        // Create a credit transaction to update contact balance
        // Only for incoming checks (direction: 'in')
        if (input.contact_id && input.direction === 'in') {
            console.log('[FinanceService] Creating credit transaction for check');
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    tenant_id: tenantId,
                    contact_id: input.contact_id,
                    type: 'credit',
                    category: 'collection',
                    amount: input.amount,
                    description: input.description || `Çek Tahsilat`,
                    order_id: input.order_id || null,
                    reference_id: data.id // Link to check
                });

            if (txError) {
                console.error('[FinanceService] Transaction insert error:', txError);
                // Don't throw, check was created successfully
            } else {
                // Update contact balance
                const { data: contact } = await supabase
                    .from('contacts')
                    .select('balance')
                    .eq('id', input.contact_id)
                    .single();

                if (contact) {
                    const newBalance = Number(contact.balance || 0) - Number(input.amount);
                    await supabase
                        .from('contacts')
                        .update({ balance: newBalance })
                        .eq('id', input.contact_id);
                    console.log(`[FinanceService] Updated balance: ${contact.balance} -> ${newBalance}`);

                    // Trigger Order Status Update
                    if (input.order_id) {
                        try {
                            const { contactService } = await import('./contact.service');
                            await contactService.updateOrderPaymentStatus(tenantId, input.order_id);
                        } catch (err) {
                            console.error('[FinanceService] Failed to update order status:', err);
                        }
                    }
                }
            }
        }

        return data;
    }

    /**
     * Get All Expenses (Global Ledger with type=expense)
     */
    async getExpenses(tenantId: string, page = 1, limit = 20) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('finance_transactions')
            .select('*, contacts(name), finance_accounts(name)', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('type', 'expense')
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw new Error(error.message);
        return { data, meta: { total: count, page, limit } };
    }
}

export const financeService = new FinanceService();
