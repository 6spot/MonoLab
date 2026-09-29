import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const databaseURL = readFileSync(process.env.MONOS_DATABASE_URL_FILE, 'utf8').trim();
const result = spawnSync('pnpm', ['test:db'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseURL } });
process.exitCode = result.status ?? 1;
