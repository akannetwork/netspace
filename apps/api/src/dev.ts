import { buildApp } from './app';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const start = async () => {
    const app = await buildApp();
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`API running locally on http://localhost:${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
