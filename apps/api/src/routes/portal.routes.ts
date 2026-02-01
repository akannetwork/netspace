import { FastifyInstance } from 'fastify';
import { hrService } from '../services/hr.service';
import { supabase } from '../config/supabase';

export async function portalRoutes(fastify: FastifyInstance) {
    // All routes here are protected and specific to the logged-in personnel
    fastify.addHook('onRequest', fastify.authenticate);

    // Middleware: Ensure user is a personnel and get their contact_id
    fastify.addHook('preHandler', async (request, reply) => {
        const user = request.user as any;
        if (user.context !== 'portal') {
            return reply.code(403).send({ error: 'Access denied: Not a portal session' });
        }

        const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', user.uid)
            .eq('type', 'personnel')
            .single();

        if (!contact) {
            return reply.code(403).send({ error: 'Personnel record not found' });
        }

        (request as any).personnelId = contact.id;
    });

    // GET /portal/profile
    fastify.get('/portal/profile', async (request) => {
        const personnelId = (request as any).personnelId;
        const { data } = await supabase.from('contacts').select('*').eq('id', personnelId).single();
        return data;
    });

    // GET /portal/timesheets
    fastify.get('/portal/timesheets', async (request) => {
        const personnelId = (request as any).personnelId;
        const user = request.user as any;
        const now = new Date();
        const month = (request.query as any).month || (now.getMonth() + 1);
        const year = (request.query as any).year || now.getFullYear();

        return await hrService.getTimesheets(user.tenant_id, personnelId, Number(month), Number(year));
    });

    // GET /portal/summary
    fastify.get('/portal/summary', async (request) => {
        const personnelId = (request as any).personnelId;
        const user = request.user as any;
        const now = new Date();
        const month = (request.query as any).month || (now.getMonth() + 1);
        const year = (request.query as any).year || now.getFullYear();

        return await hrService.getPayrollSummary(user.tenant_id, personnelId, Number(month), Number(year));
    });

    // GET /portal/ledger
    fastify.get('/portal/ledger', async (request) => {
        const personnelId = (request as any).personnelId;
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('contact_id', personnelId)
            .order('created_at', { ascending: false });
        return data;
    });
}
