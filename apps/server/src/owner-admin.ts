import { readFile } from 'node:fs/promises';
import { database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import { bootstrapOwner } from './owner-access.ts';
import { CommandError } from '../../../packages/domain/src/commands.ts';

// Password input must never be an argv value or an output field.
try {
  if (process.argv.slice(2).some((arg) => arg !== '--rotate')) throw new Error('Unsupported option');
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 4096) throw new Error('Input exceeds limit');
    chunks.push(Buffer.from(chunk));
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { password: string };
  if (!body || Object.keys(body).join(',') !== 'password') throw new Error('Expected password JSON');
  const url = process.env.MONOS_DATABASE_URL_FILE ? (await readFile(process.env.MONOS_DATABASE_URL_FILE, 'utf8')).trim() : process.env.DATABASE_URL;
  if (!url) throw new Error('Database configuration required');
  const db = database(url);
  try {
    await migrate(db);
    await bootstrapOwner(db, body.password, process.argv.includes('--rotate'));
    process.stdout.write('Owner access configured. Existing sessions were revoked on rotation.\n');
  } finally { await db.pool.end(); }
} catch (error) {
  process.stderr.write(error instanceof CommandError ? `${error.detail.message}\n` : 'Owner setup failed; check database configuration and bounded password JSON on stdin.\n');
  process.exitCode = 1;
}
