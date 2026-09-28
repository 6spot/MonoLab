import { readFile } from 'node:fs/promises';
import { database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import { createApp } from './app.ts';
import { BoundaryService } from './service.ts';

const required = (name: string): string => { const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return value; };
const databaseURL = process.env.MONOLAB_DATABASE_URL_FILE ? (await readFile(process.env.MONOLAB_DATABASE_URL_FILE, 'utf8')).trim() : required('DATABASE_URL');
const db = database(databaseURL);
await migrate(db);
const signingKey = (await readFile(required('MONOLAB_SIGNING_KEY_FILE'), 'utf8')).trim();
const app = createApp(new BoundaryService(db, { signingKey }), {
  key: await readFile(required('MONOLAB_TLS_KEY_FILE')),
  cert: await readFile(required('MONOLAB_TLS_CERT_FILE')),
});
await app.listen({ host: process.env.MONOLAB_LISTEN_HOST ?? '127.0.0.1', port: Number(process.env.MONOLAB_PORT ?? 18443) });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void app.close().then(() => db.pool.end()); });
