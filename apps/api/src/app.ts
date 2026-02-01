import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwtPlugin from './plugins/jwt';
import tenantResolver from './plugins/tenant-resolver';
import { authRoutes } from './routes/auth.routes';
import { tenantRoutes } from './routes/tenant.routes';
import { officeRoutes } from './routes/office.routes';
import { studioRoutes } from './routes/studio.routes';
import { publicRoutes } from './routes/public.routes';
import { platformRoutes } from './routes/platform.routes';
import { portalRoutes } from './routes/portal.routes';

// ... (inside registerRoutes or equivalent)
// We need to see the file content properly first, but assuming standard fastify register


export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: true,
    });

    // 1. CORS
    await app.register(cors, {
        origin: (_origin, cb) => {
            cb(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    });

    // 1.1 Multipart Support
    // IMPORTANT: specific limits are set here to prevent DOS.
    await app.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
        }
    });

    // 2. JWT Plugin
    await app.register(jwtPlugin);

    // 3. Tenant Resolver Plugin
    await app.register(tenantResolver);

    // 4. Routes
    app.register(authRoutes);
    app.register(tenantRoutes);
    app.register(platformRoutes);
    app.register(portalRoutes);
    app.register(officeRoutes);
    app.register(studioRoutes);
    app.register(publicRoutes);

    app.get('/health', async () => ({ status: 'ok' }));

    return app;
}

// Forced Restart Trigger
