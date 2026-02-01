import { FastifyInstance } from 'fastify';
import { studioService } from '../services/studio.service';

export async function studioRoutes(fastify: FastifyInstance) {

    // --- PRO PANEL ROUTES (Protected) ---

    fastify.get('/studio/settings', {
        // Ensure user has access to STUDIO tab
        onRequest: [fastify.requireTab('studio')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await studioService.getSettings(tenantId);
    });

    fastify.post('/studio/settings', {
        // Usually editing theme is a specific permission
        onRequest: [fastify.requireTab('studio'), fastify.requirePermission('studio.settings.edit')]
    }, async (request) => {
        // @ts-ignore
        const tenantId = request.user.tenant_id as string;
        return await studioService.updateSettings(tenantId, request.body);
    });


    // --- PUBLIC STOREFRONT ROUTES (Open) ---

    // Note: These might be better under a /storefront prefix or just root
    // depending on how we want to structure it. Let's keep it under /public/store logic
    // But for now, let's expose specific endpoint for Next.js middleware/server components to fetch

    fastify.get('/public/store/:slug', async (request, reply) => {
        const { slug } = request.params as any;
        const data = await studioService.getPublicSettings(slug);

        if (!data) return reply.status(404).send({ error: 'Store not found' });
        return data;
    });

    fastify.get('/public/store/:slug/products', async (request, reply) => {
        const { slug } = request.params as any;
        reply.header('Cache-Control', 'public, max-age=60');
        return await studioService.getPublicProducts(slug);
    });

    fastify.get('/public/store/:slug/services', async (request, reply) => {
        const { slug } = request.params as any;
        reply.header('Cache-Control', 'public, max-age=60');
        return await studioService.getPublicServices(slug);
    });
}
