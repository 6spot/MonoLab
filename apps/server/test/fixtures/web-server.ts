import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { database } from '../../../../packages/db/src/index.ts';
import { migrate } from '../../../../packages/db/src/migrate.ts';
import { bootstrapOwner } from '../../src/owner-access.ts';
import { createApp } from '../../src/app.ts';
import { BoundaryService } from '../../src/service.ts';

// Test-only process: never use an existing schema or deployed Owner credentials.
const connection = process.env.MONOLAB_TEST_WEB_DATABASE_URL;
if (!connection) throw new Error('MONOLAB_TEST_WEB_DATABASE_URL is required for isolated browser tests');
const namespace = `web_test_${randomUUID().replaceAll('-', '')}`;
const admin = database(connection);
await admin.pool.query(`CREATE SCHEMA ${namespace}`);
const url = new URL(connection); url.searchParams.set('options', `-c search_path=${namespace} -c statement_timeout=10000`);
const db = database(url.toString());
const app = createApp(new BoundaryService(db, { signingKey: 'synthetic-browser-test-service-signing-key' }), undefined, fileURLToPath(new URL('../../../web/dist', import.meta.url)));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  try { await app.close(); } finally {
    try { await db.pool.end(); } finally {
      try { await admin.pool.query(`DROP SCHEMA ${namespace} CASCADE`); } finally { await admin.pool.end(); }
    }
  }
}
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void close(); });

try {
  await migrate(db);
  await bootstrapOwner(db, 'monolab-browser-test-password');
  await app.listen({ host: '127.0.0.1', port: 18555 });
  process.stdout.write('Isolated browser test server ready on port 18555.\n');
} catch {
  await close();
  throw new Error('Isolated browser test server failed to start');
}
