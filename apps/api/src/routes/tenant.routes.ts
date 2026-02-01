import { FastifyInstance } from 'fastify';

export async function tenantRoutes(fastify: FastifyInstance) {

    // GET /tenant/profile
    // Public endpoint, but requires tenant context
    fastify.get('/tenant/profile', async (request, reply) => {
        const tenant = request.tenant;

        if (!tenant) {
            // This happens if x-tenant-slug header was missing
            return reply.code(400).send({
                error: 'Missing tenant context',
                message: 'This endpoint requires x-tenant-slug header'
            });
        }

        // Return safe public profile
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.custom_domain,
            status: tenant.status,
            subscription_features: tenant.subscription_features,
            context: request.requestContext
        };
    });
}
