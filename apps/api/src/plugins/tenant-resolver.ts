import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';

// 1. Extend FastifyRequest type
declare module 'fastify' {
    interface FastifyRequest {
        tenant: {
            id: string;
            name: string;
            slug: string;
            custom_domain: string | null;
            status: string;
            subscription_features: any; // Using any for JSONB flexibility
        } | null;
        requestContext: 'hauze' | 'pro' | 'tenant' | 'admin' | 'public';
    }
}

export default fp(async (fastify: FastifyInstance, _opts: any) => {

    // 2. Global Hook for Tenant Resolution
    fastify.decorateRequest('tenant', null);
    fastify.decorateRequest('requestContext', 'public');

    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        const slug = request.headers['x-tenant-slug'] as string;
        const context = request.headers['x-context'] as any;

        // Set Context
        if (context) {
            request.requestContext = context;
        }

        // Skip if no slug provided (e.g. admin or pro panel requests)
        if (!slug) {
            return;
        }

        // 3. Resolve Tenant from DB
        // Simple caching could be added here (Redis/LRU) for production
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('id, name, slug, custom_domain, status, subscription_features')
            .eq('slug', slug)
            .single();

        if (error || !tenant) {
            // If a slug is provided but not found, it's a 404 for the tenant context
            // We throw immediately here because if the middleware said "this is tenant X",
            // and DB says "no it isn't", the request is invalid.
            // However, for blank setup, let's return 404.
            return reply.code(404).send({ error: 'Tenant not found', code: 'TENANT_NOT_FOUND' });
        }

        // 4. Inject Tenant into Request
        request.tenant = tenant;
    });
});
