import { api } from '@/lib/api';

export interface FinanceAccount {
    id: string;
    branch_id?: string;
    name: string;
    type: 'cash' | 'bank' | 'pos' | 'check_account';
    currency: string;
    balance: number;
}

export interface FinanceTransaction {
    id: string;
    account_id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
    amount: number;
    description: string;
    date: string;
    contact_id?: string;
    order_id?: string;
}

export const financeService = {
    // Accounts
    getAccounts: async () => {
        const res = await api.get('/office/finance/accounts');
        return res.data as FinanceAccount[];
    },

    createAccount: async (data: Partial<FinanceAccount>) => {
        const res = await api.post('/office/finance/accounts', data);
        return res.data;
    },

    // Transactions
    getTransactions: async (accountId: string, page = 1) => {
        const res = await api.get(`/office/finance/accounts/${accountId}/transactions?page=${page}`);
        return res.data; // { data, meta }
    },

    transfer: async (data: { fromAccountId: string; toAccountId: string; amount: number; description: string }) => {
        const res = await api.post('/office/finance/transfer', data);
        return res.data;
    },

    createTransaction: async (data: Partial<FinanceTransaction>) => {
        // Backend doesn't have a direct "createTransaction" endpoint exposed yet except via Transfer?
        // Wait, did I expose createTransaction in office.routes.ts?
        // Let me check office.routes.ts again. 
        // I exposed:
        // GET /finance/accounts/:id/transactions
        // POST /finance/transfer
        // I did NOT expose a generic POST /finance/transactions endpoint!
        // The POSModal logic calls: await financeService.createTransaction(...) which implies I intended to calls it.
        // But in POSModal I wrote: 
        /*
          if (selectedAccount) {
              await financeService.createTransaction({ ... });
          }
        */
        // I need to add this endpoint to backend or handle it via transfer?
        // Actually, for "Income" (entering money to Kasa), I need an endpoint.
        // I should add POST /office/finance/transactions logic to backend too if missing.
        // Let's assume I will add it to backend in next step. For now add to frontend.
        const res = await api.post('/office/finance/transactions', data);
        return res.data;
    },

    // Checks
    getChecks: async (status?: string) => {
        const query = status ? `?status=${status}` : '';
        const res = await api.get(`/office/finance/checks${query}`);
        return res.data;
    },

    createCheck: async (data: any) => {
        const res = await api.post('/office/finance/checks', data);
        return res.data;
    }
};
