import { FastifyInstance } from 'fastify';
import { catalogService } from '../services/catalog.service';

export async function officeRoutes(fastify: FastifyInstance) {

    // DEBUG: Check Orders directly (Moved to top)
    fastify.get('/office/debug-orders', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { supabase } = await import('../config/supabase');

        const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { data } = await supabase.from('orders').select('id, order_number, tenant_id').order('created_at', { ascending: false }).limit(5);
        return { currentUserTenant: tenantId, totalOrdersInDB: count, recentOrders: data };
    });

    // Global Guard for all /office routes
    // Only users with access to OFFICE tab can touch these endpoints
    fastify.addHook('onRequest', fastify.requireTab('office'));

    // --- UPLOAD ---
    // Moved here to be protected by OFFICE tab guard
    const { storageService } = await import('../services/storage.service');

    fastify.post('/office/upload', async (request, reply) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');

        const multipartRequest = request as any;
        const file = await multipartRequest.file();
        if (!file) throw new Error('No file uploaded');

        try {
            request.log.info({ filename: file.filename, mimetype: file.mimetype }, 'Starting file upload');
            // Ensure bucket exists (best effort)
            // Note: In production you should create bucket manually.
            const url = await storageService.uploadFile(tenantId, file, 'products');
            request.log.info({ url }, 'File upload successful');
            return { url };
        } catch (err: any) {
            request.log.error(err, 'Upload Failed in Route');
            reply.code(500).send({ error: `Upload Failed: ${err.message}` });
        }
    });

    // --- CATEGORIES ---

    fastify.get('/office/categories', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await catalogService.getCategories(tenantId, query.type);
    });

    fastify.post('/office/categories', {
        onRequest: [fastify.requirePermission('office.inventory.create')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await catalogService.createCategory(tenantId, request.body);
    });

    fastify.put('/office/categories/:id', {
        onRequest: [fastify.requirePermission('office.inventory.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await catalogService.updateCategory(tenantId, id, request.body);
    });

    fastify.delete('/office/categories/:id', {
        onRequest: [fastify.requirePermission('office.inventory.delete')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await catalogService.deleteCategory(tenantId, id);
    });

    // --- PRODUCTS ---

    fastify.get('/office/products', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const query = request.query as any;
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');
        return await catalogService.getProducts(tenantId, query, page, limit);
    });

    fastify.get('/office/products/:id', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await catalogService.getProduct(tenantId, id);
    });

    fastify.post('/office/products', {
        onRequest: [fastify.requirePermission('office.inventory.create')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await catalogService.createProduct(tenantId, request.body);
    });

    fastify.put('/office/products/:id', {
        onRequest: [fastify.requirePermission('office.inventory.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await catalogService.updateProduct(tenantId, id, request.body);
    });

    fastify.delete('/office/products/:id', {
        onRequest: [fastify.requirePermission('office.inventory.delete')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await catalogService.deleteProduct(tenantId, id);
    });

    // --- INVENTORY ---

    // Lazy load service to avoid circular deps if any (good practice in large apps)
    const { inventoryService } = await import('../services/inventory.service');


    fastify.get('/office/branches', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await inventoryService.getBranches(tenantId);
    });

    fastify.post('/office/branches', {
        onRequest: [fastify.requirePermission('office.settings.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await inventoryService.createBranch(tenantId, request.body);
    });

    fastify.put('/office/branches/:id', {
        onRequest: [fastify.requirePermission('office.settings.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await inventoryService.updateBranch(tenantId, id, request.body);
    });

    fastify.delete('/office/branches/:id', {
        onRequest: [fastify.requirePermission('office.settings.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const { id } = request.params as any;
        return await inventoryService.deleteBranch(tenantId, id);
    });

    fastify.get('/office/inventory', {
        onRequest: [fastify.requirePermission('office.inventory.view')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        const query = request.query as any;
        return await inventoryService.getInventory(tenantId, query);
    });

    fastify.post('/office/inventory/adjust', {
        onRequest: [fastify.requirePermission('office.inventory.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await inventoryService.adjustStock(tenantId, request.body);
    });
    // --- ORDERS ---

    const { personnelService } = await import('../services/personnel.service');

    fastify.get('/office/personnel', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await personnelService.getPersonnel(tenantId, query.branch_id);
    });

    fastify.get('/office/personnel/:id', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await personnelService.getPersonnelById(tenantId, id);
    });

    fastify.post('/office/personnel', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;

        if (!tenantId) throw new Error('Tenant Context Missing');
        if (!body.branch_id) throw new Error('Branch Context Missing');

        return await personnelService.createPersonnel(tenantId, body.branch_id, body);
    });

    const { orderService } = await import('../services/order.service');

    fastify.post('/office/orders', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;

        if (!tenantId) throw new Error('Tenant Context Missing');

        return await orderService.createInternalOrder(tenantId, body);
    });

    fastify.get('/office/orders', {
        onRequest: [fastify.requirePermission('office.orders.view')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        // @ts-ignore
        const userBranchId = request.headers['x-branch-id'] as string; // From Request Header set by UI

        const query = request.query as any;
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');

        // Logic:
        // 1. If User requests specific branch (query.branch_id), trust it? NO.
        // 2. Must check if user belongs to that branch or is HQ.
        // For now, let's rely on the Header sent by the UI context.
        // TODO: In real auth, we should validate signature or DB role.
        // Assuming "HQ" branch has a specific flag or we check "type". 
        // For MVP: If x-branch-id is provided, use it. If UI says "All" (HQ view), it might send empty or 'all'.

        // Simplified Logic requested by User:
        // CENTER (HQ) = ALL
        // BRANCH = OWN

        // We need to know if the current selected branch is HQ.
        // Since we don't have easy "Is HQ?" check here without DB call, 
        // We will assume the UI sends the filter implementation.
        // BUT, for security, we should filter by the header 'x-branch-id'.

        // Let's look up the branch type if possible, or trust the client for now (internal tool).
        // Better: Let UI send `branch_id` query param. 
        // If current branch context is NOT HQ, we must ENFORCE `branch_id`.

        // Implementation:
        // We will fetch the branch details for the `userBranchId` (or the one in header) to see if it is HQ.
        // If it is 'store' or 'warehouse', we enforce filtering.

        let filterBranchId = undefined;

        if (userBranchId) {
            const { inventoryService } = await import('../services/inventory.service');
            const branches = await inventoryService.getBranches(tenantId);
            const currentBranch = branches.find(b => b.id === userBranchId);

            const bType = (currentBranch?.type || '').toLowerCase();
            // If current branch is HQ OR no branch is found (Center fallback), assume HQ
            const isHQ = !currentBranch || (bType === 'headquarters' || bType === 'hq' || currentBranch.is_main);

            if (isHQ) {
                if (query.branch_id) filterBranchId = query.branch_id;
                else filterBranchId = undefined;
            } else {
                filterBranchId = userBranchId;
            }
        } else {
            // No branch header? Default to all
            filterBranchId = query.branch_id;
        }

        // Use explicit is_hq override if provided
        const isHQOverride = query.is_hq === 'true';

        // Additional filters for TransactionModal
        const contactId = query.contact_id as string | undefined;
        const paymentStatus = query.payment_status as string | undefined;

        return await orderService.getOrders(tenantId, page, limit, filterBranchId, isHQOverride, contactId, paymentStatus);
    });

    fastify.get('/office/orders/:id', {
        onRequest: [fastify.requirePermission('office.orders.view')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        return await orderService.getOrder(tenantId, id);
    });

    fastify.put('/office/orders/:id/status', {
        onRequest: [fastify.requirePermission('office.orders.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const { status } = request.body as any;
        return await orderService.updateStatus(tenantId, id, status);
    });

    // --- DASHBOARD ---
    const { dashboardService } = await import('../services/dashboard.service');

    fastify.get('/office/dashboard/stats', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        // const query = request.query as any; 
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await dashboardService.getStats(tenantId);
    });

    fastify.get('/office/dashboard/low-stock', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await dashboardService.getLowStock(tenantId, query.branch_id);
    });

    fastify.get('/office/dashboard/recent-orders', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await dashboardService.getRecentOrders(tenantId);
    });

    // --- CONTACTS (Cari Hesaplar) ---
    const { contactService } = await import('../services/contact.service');

    // List Contacts
    fastify.get('/office/contacts', {
        // onRequest: [fastify.requirePermission('office.contacts.view')] // Debugging: Disabled
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await contactService.getContacts(tenantId, query.type, page, limit, query.search);
    });

    // Get Single Contact (with transactions via separate endpoint or expand? Keeping separate for now)
    fastify.get('/office/contacts/:id', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await contactService.getContact(tenantId, id);
    });

    // Create Contact
    fastify.post('/office/contacts', {
        // onRequest: [fastify.requirePermission('office.contacts.create')] // Debugging: Disabled
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await contactService.createContact(tenantId, request.body as any);
    });

    // Get Transactions (Ledger)
    fastify.get('/office/contacts/:id/transactions', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await contactService.getTransactions(tenantId, id);
    });

    // Add Transaction (Manual)
    // Get Pending Orders for Contact
    fastify.get('/office/contacts/:id/orders', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        if (!tenantId) throw new Error('Tenant Context Missing');

        return await contactService.getPendingOrders(tenantId, id);
    });

    fastify.post('/office/contacts/transactions', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await contactService.addTransaction(tenantId, body);
    });
    // --- HR & PAYROLL ---
    const { hrService } = await import('../services/hr.service');

    // Get Monthly Timesheets
    fastify.get('/office/personnel/:id/timesheets', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const query = request.query as any;
        const month = parseInt(query.month || new Date().getMonth() + 1);
        const year = parseInt(query.year || new Date().getFullYear());

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await hrService.getTimesheets(tenantId, id, month, year);
    });

    // Get ALL Timesheets for Tenant (Bulk View)
    fastify.get('/office/timesheets', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        const month = parseInt(query.month || new Date().getMonth() + 1);
        const year = parseInt(query.year || new Date().getFullYear());

        console.log(`[API] GET /office/timesheets - Tenant: ${tenantId}, Month: ${month}, Year: ${year}`);

        if (!tenantId) throw new Error('Tenant Context Missing');
        const result = await hrService.getTimesheetsByTenant(tenantId, month, year);
        console.log(`[API] Found ${result.length} timesheets.`);
        return result;
    });

    // Bulk Upsert Timesheet Entries
    fastify.post('/office/personnel/timesheets/bulk', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any; // Expects TimesheetInput[]
        console.log(`[API] POST /bulk - Count: ${body?.length}`);

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await hrService.upsertTimesheetsBulk(tenantId, body);
    });

    // Upsert Timesheet Entry
    fastify.post('/office/personnel/timesheets', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await hrService.upsertTimesheet(tenantId, body);
    });

    // Delete Timesheet Entry
    fastify.delete('/office/personnel/:id/timesheets', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const query = request.query as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        if (!query.date) throw new Error('Date required');

        return await hrService.deleteTimesheet(tenantId, id, query.date);
    });

    // Get Payroll Summary
    fastify.get('/office/personnel/:id/payroll', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const query = request.query as any;
        const month = parseInt(query.month || new Date().getMonth() + 1);
        const year = parseInt(query.year || new Date().getFullYear());

        if (!tenantId) throw new Error('Tenant Context Missing');
        return await hrService.getPayrollSummary(tenantId, id, month, year);
    });

    fastify.get('/office/personnel/:id/transactions', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const query = request.query as any;
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');

        if (!tenantId) throw new Error('Tenant Context Missing');
        // We reuse contactService used for transactions
        return await contactService.getTransactionsByPersonnelId(tenantId, id, page, limit);
    });

    // Delete Personnel (Cascade)
    fastify.delete('/office/personnel/:id', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        if (!tenantId) throw new Error('Tenant Context Missing');

        return await personnelService.deletePersonnel(tenantId, id);
    });

    // --- FINANCE MODULE ---
    const { financeService } = await import('../services/finance.service');

    // 1. Accounts (Kasa, Banka)
    fastify.get('/office/finance/accounts', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        // @ts-ignore
        const userBranchId = request.headers['x-branch-id'] as string;

        // Return accounts for current branch AND global accounts
        return await financeService.getAccounts(tenantId, userBranchId);
    });

    fastify.post('/office/finance/accounts', async (request) => {
        console.log('[API] POST /office/finance/accounts hit');
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        console.log('[API] Check Payload:', { tenantId, body });
        return await financeService.createAccount(tenantId, body);
    });

    fastify.delete('/office/finance/accounts/:id', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        return await financeService.deleteAccount(tenantId, id);
    });

    // 2. Transactions (Ledger)
    fastify.get('/office/finance/accounts/:id/transactions', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const query = request.query as any;
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');

        return await financeService.getTransactions(tenantId, id, page, limit);
    });

    fastify.post('/office/finance/transactions', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        if (!tenantId) throw new Error('Tenant Context Missing');
        return await financeService.createTransaction(tenantId, body);
    });

    fastify.post('/office/finance/transfer', {
        onRequest: [fastify.requirePermission('inventory.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        // body: { fromAccountId, toAccountId, amount, description }
        return await financeService.transfer(tenantId, body.fromAccountId, body.toAccountId, body.amount, body.description);
    });

    // 3. Checks (Çekler)
    fastify.get('/office/finance/checks', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        return await financeService.getChecks(tenantId, query.status);
    });

    fastify.post('/office/finance/checks', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        return await financeService.createCheck(tenantId, body);
    });


    // 4. Receivables (Alacaklar)
    const { receivableService } = await import('../services/receivable.service');

    fastify.get('/office/finance/receivables/stats', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await receivableService.getStats(tenantId);
    });

    fastify.get('/office/finance/receivables/debtors', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        return await receivableService.getDebtors(tenantId, parseInt(query.page || '1'), parseInt(query.limit || '20'));
    });

    fastify.get('/office/finance/receivables/installments', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await receivableService.getUpcomingInstallments(tenantId);
    });

    // Create Installments (Used by POS)
    fastify.post('/office/finance/installments', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any; // Array of installments
        return await receivableService.createInstallments(tenantId, body);
    });

    // Pay Installment
    fastify.post('/office/finance/installments/:id/pay', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as { id: string };
        const body = request.body as any;
        return await receivableService.payInstallment(tenantId, {
            installment_id: id,
            ...body
        });
    });

    // 5. Payables (Ödemeler)
    const { payableService } = await import('../services/payable.service');

    fastify.get('/office/finance/payables/stats', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await payableService.getStats(tenantId);
    });

    fastify.get('/office/finance/payables/creditors', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const query = request.query as any;
        return await payableService.getCreditors(tenantId, parseInt(query.page || '1'), parseInt(query.limit || '20'));
    });

    fastify.get('/office/finance/payables/recurring', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await payableService.getRecurringPayments(tenantId);
    });

    fastify.post('/office/finance/payables/recurring', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const body = request.body as any;
        return await payableService.createRecurring(tenantId, body);
    });

    fastify.get('/office/finance/payables/checks', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await payableService.getOutgoingChecks(tenantId);
    });


    // --- SERVICES & DYNAMIC PRICING ---
    const { serviceService } = await import('../services/service.service');

    fastify.get('/office/services/:id/template', async (request) => {
        const { id } = request.params as any;
        return await serviceService.getServiceTemplate(id);
    });

    fastify.post('/office/services/:id/calculate', async (request) => {
        const { id } = request.params as any;
        const { config, quantity } = request.body as any;
        return await serviceService.calculatePrice(id, config, quantity);
    });

    // Admin: Manage Service Attributes
    fastify.post('/office/services/:id/attributes', {
        onRequest: [fastify.requirePermission('office.inventory.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const { supabase } = await import('../config/supabase');

        const { data, error } = await supabase
            .from('service_attributes')
            .insert({ ...request.body as any, product_id: id, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return data;
    });

    fastify.post('/office/services/attributes/:id/options', {
        onRequest: [fastify.requirePermission('office.inventory.edit')]
    }, async (request) => {
        const { id } = request.params as any;
        const { supabase } = await import('../config/supabase');

        const { data, error } = await supabase
            .from('service_attribute_options')
            .insert({ ...request.body as any, attribute_id: id })
            .select()
            .single();

        if (error) throw error;
        return data;
    });

    fastify.delete('/office/services/attributes/:id', async (request) => {
        const { id } = request.params as any;
        const { supabase } = await import('../config/supabase');
        // Delete options first due to FK
        await supabase.from('service_attribute_options').delete().eq('attribute_id', id);
        const { error } = await supabase.from('service_attributes').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    });

    fastify.delete('/office/services/options/:id', async (request) => {
        const { id } = request.params as any;
        const { supabase } = await import('../config/supabase');
        const { error } = await supabase.from('service_attribute_options').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    });

    // --- USER & ROLE MANAGEMENT ---
    const { userService } = await import('../services/user.service');

    fastify.get('/office/users', {
        onRequest: [fastify.requirePermission('office.users.view')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await userService.getTenantUsers(tenantId);
    });

    fastify.get('/office/roles', {
        onRequest: [fastify.requirePermission('office.users.view')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await userService.getTenantRoles(tenantId);
    });

    fastify.post('/office/users', {
        onRequest: [fastify.requirePermission('office.users.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await userService.addTenantUser(tenantId, request.body as any);
    });

    fastify.put('/office/users/:id', {
        onRequest: [fastify.requirePermission('office.users.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        const body = request.body as any;

        // If updating permissions (boolean flags)
        if (body.permissions || body.authorized_branches) {
            const updates = { ...body.permissions };
            if (body.authorized_branches) updates.authorized_branches = body.authorized_branches;
            return await userService.updateUserPermissions(tenantId, id, updates);
        }

        return await userService.updateUserRole(tenantId, id, body.role_id);
    });

    // NEW: Get Personnel Candidates
    fastify.get('/office/personnel/users-candidates', {
        onRequest: [fastify.requirePermission('office.users.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await userService.getPersonnelCandidates(tenantId);
    });

    // NEW: Create User from Personnel
    fastify.post('/office/users/from-personnel', {
        onRequest: [fastify.requirePermission('office.users.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await userService.createPersonnelUser(tenantId, request.body);
    });

    fastify.delete('/office/users/:id', {
        onRequest: [fastify.requirePermission('office.users.manage')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { id } = request.params as any;
        return await userService.removeTenantUser(tenantId, id);
    });

    // --- SURVEYS ---
    const { surveyService } = await import('../services/survey.service');

    fastify.post('/office/surveys/generate', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        const { order_id } = request.body as any;
        return await surveyService.generateSurvey(tenantId, order_id);
    });

    fastify.get('/office/surveys/report', async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await surveyService.getSurveyReport(tenantId);
    });
}
