import { FastifyInstance } from 'fastify';
import { platformService } from '../services/platform.service';

export async function platformRoutes(fastify: FastifyInstance) {

    // Helper to check if user is Super Admin (Mock for now or check phone)
    // For dev: Open access or simple header check

    fastify.get('/platform/tenants', async (_request, _reply) => {
        return await platformService.getTenants();
    });

    fastify.post('/platform/tenants', async (request, reply) => {
        const body = request.body as any;
        // Basic validation
        if (!body.name || !body.slug || !body.owner_phone) {
            return reply.code(400).send({ error: 'Missing Required Fields' });
        }

        return await platformService.createTenant({
            name: body.name,
            slug: body.slug,
            owner_phone: body.owner_phone,
            owner_name: body.owner_name || 'System Owner',
            owner_email: body.owner_email,
            subscription_features: body.subscription_features
        });
    });

    fastify.put('/platform/tenants/:id', async (request, _reply) => {
        const { id } = request.params as any;
        const body = request.body as any;
        return await platformService.updateTenant(id, body);
    });

    fastify.delete('/platform/tenants/:id', async (request, reply) => {
        const { id } = request.params as any;
        if (!id) return reply.code(400).send({ error: 'Tenant ID required' });
        return await platformService.deleteTenantAtomic(id);
    });
}
