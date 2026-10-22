import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';

const app = createApp();
const server = app.listen(env.port, () => console.log(`API KMB en écoute sur le port ${env.port}`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
