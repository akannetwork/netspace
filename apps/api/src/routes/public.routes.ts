import { FastifyInstance } from 'fastify';
import { orderService } from '../services/order.service';
import { surveyService } from '../services/survey.service';
import { serviceService } from '../services/service.service';
import { supabase } from '../config/supabase';

export async function publicRoutes(fastify: FastifyInstance) {

    // --- SURVEYS ---
    fastify.get('/public/surveys/:token', async (request) => {
        const { token } = request.params as any;
        return await surveyService.getStoreByToken(token);
    });

    fastify.post('/public/surveys/:token', async (request) => {
        const { token } = request.params as any;
        const { score, comment } = request.body as any;
        return await surveyService.submitFeedback(token, score, comment);
    });

    // Debug Route for Auth Issues
    fastify.get('/debug/auth-info', async (_request, _reply) => {
        const { data: users } = await supabase.from('users').select('*');
        const { data: tenants } = await supabase.from('tenants').select('*');
        const { data: links } = await supabase.from('tenant_users').select('*');

        return {
            users,
            tenants,
            links,
            env_check: {
                url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
                key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
            }
        };
    });

    // POST /public/checkout
    fastify.post('/public/checkout', async (request, reply) => {
        const body = request.body as any;

        try {
            const order = await orderService.createOrder(body);
            return reply.code(201).send(order);
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // --- SERVICES ---
    fastify.get('/public/services/:id/template', async (request) => {
        const { id } = request.params as any;
        return await serviceService.getServiceTemplate(id);
    });

    fastify.post('/public/services/:id/calculate', async (request) => {
        const { id } = request.params as any;
        const { config, quantity } = request.body as any;
        return await serviceService.calculatePrice(id, config, quantity);
    });

}
