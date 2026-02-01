import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Extended Types
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            uid: string;
            context: 'hauze' | 'pro' | 'tenant' | 'admin';
            tenant_id?: string;
            role?: string;
        };
        user: {
            uid: string;
            context: string;
            tenant_id?: string;
            role?: string;
        };
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireTab: (tab: 'dashboard' | 'office' | 'market' | 'go' | 'studio') => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export default fp(async (fastify: FastifyInstance, _opts: any) => {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecretkey_change_in_production',
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send(err);
        }
    });

    // 1. Tab Guard
    fastify.decorate('requireTab', (tab: 'dashboard' | 'office' | 'market' | 'go' | 'studio') => {
        return async (request: FastifyRequest, reply: FastifyReply) => {
            // Ensure authenticated first
            await request.jwtVerify();

            const { uid, tenant_id } = request.user;

            // If not in a tenant context (e.g. platform admin), logic might differ
            if (!tenant_id) return;

            // Improve: Import dynamically to avoid circular deps if any, but service is safe here
            const { securityService } = await import('../services/security.service');

            const hasAccess = await securityService.hasTabAccess({
                userId: uid,
                tenantId: tenant_id,
                tab
            });

            if (!hasAccess) {
                reply.status(403).send({ error: 'Forbidden', message: `You do not have access to [${tab}] tab.` });
            }
        }
    });

    // 2. Permission Guard
    fastify.decorate('requirePermission', (permission: string) => {
        return async (request: FastifyRequest, reply: FastifyReply) => {
            await request.jwtVerify();

            const { uid, tenant_id } = request.user;
            if (!tenant_id) return;

            const { securityService } = await import('../services/security.service');

            const hasAccess = await securityService.hasPermission({
                userId: uid,
                tenantId: tenant_id,
                permission
            });

            if (!hasAccess) {
                reply.status(403).send({ error: 'Forbidden', message: `Missing permission: ${permission}` });
            }
        }
    });

});
