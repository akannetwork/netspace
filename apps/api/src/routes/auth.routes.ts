import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';

export async function authRoutes(fastify: FastifyInstance) {

    // POST /auth/login
    fastify.post('/auth/login', async (request, reply) => {
        const body = request.body as any;
        if (!body.phone || !body.context) {
            return reply.code(400).send({ error: 'Missing phone or context' });
        }

        const result = await authService.sendOtp({ phone: body.phone, context: body.context });
        return result;
    });

    // POST /auth/register (Customer)
    fastify.post('/auth/register', async (request, reply) => {
        const body = request.body as any;
        const { phone, password, name, tenant_slug } = body;

        if (!phone || !password || !name || !tenant_slug) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            // Validate and Get Tenant ID
            // Ideally UserService should handle this or we helper it here?
            // Let's resolve tenant_id here to pass to service.
            // Wait, we need the supabase client to resolve tenant_id? 
            // Or use a helper service. 
            // Let's assume user service needs tenantId.
            // We can query tenant from DB here.

            // Actually, let's use a quick helper query or existing service method? NO public method.
            // We'll do a quick query via AuthService or similar.
            // Better: update authService to include getTenantIdBySlug? Or just do it inline since we have access to db logic usually?
            // Actually `auth.routes.ts` imports `authService`. It doesn't have db access directly?
            // It imports `authService`.
            // Let's import `userService` too?

            // Let's add `resolveTenant` to `authService`? Or just fetch it.
            // Actually `apps/api/src/config/supabase.ts` is available? No, routed via service.

            // For now, let's assume we can add `resolveTenantId` to `authService` or `userService`.
            // `userService` already has `getTenantUsers` using ID.

            // Let's add a `registerCustomer` method to `AuthService` that wraps `userService`? 
            // Or update `UserService` to accept slug? 
            // `UserService` usually takes `tenantId`.

            // I'll add `registerCustomer` to `AuthService` in next step.
            // For now, call `authService.registerCustomer`.

            const result = await authService.registerCustomer({
                tenant_slug,
                name,
                phone,
                password
            }, (payload: any, options: any) => fastify.jwt.sign(payload, options));

            return result;
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // POST /auth/verify
    fastify.post('/auth/verify', async (request, reply) => {
        const body = request.body as any;
        console.log('[DEBUG] POST /auth/verify body:', JSON.stringify(body, null, 2));

        // Require phone + context. Then either otp OR password.
        if (!body.phone || !body.context) {
            return reply.code(400).send({ error: 'Missing phone or context' });
        }
        if (!body.otp && !body.password) {
            return reply.code(400).send({ error: 'Missing authentication credential (otp or password)' });
        }

        try {
            const result = await authService.verifyOtp(
                {
                    phone: body.phone,
                    otp: body.otp,
                    password: body.password,
                    context: body.context,
                    tenant_slug: body.tenant_slug
                },
                (payload, options) => fastify.jwt.sign(payload, options)
            );
            return result;
        } catch (err: any) {
            return reply.code(401).send({ error: err.message });
        }
    });

    // POST /auth/refresh
    fastify.post('/auth/refresh', async (request, reply) => {
        const body = request.body as any;
        if (!body.refresh_token) {
            return reply.code(400).send({ error: 'Missing refresh_token' });
        }

        try {
            const result = await authService.refreshToken(
                body.refresh_token,
                (token) => fastify.jwt.verify(token),
                (payload, options) => fastify.jwt.sign(payload, options)
            );
            return result;
        } catch (err: any) {
            return reply.code(401).send({ error: err.message });
        }
    });

    // GET /me (Protected)
    fastify.get('/me', {
        onRequest: [fastify.authenticate]
    }, async (request, _reply) => {
        return {
            user: request.user,
            message: 'You are authenticated',
        };
    });
}
