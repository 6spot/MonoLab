import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
for (const directory of ['packages/protocol/schemas', 'packages/db/migrations']) {
  mkdirSync(`dist/${directory}`, { recursive: true });
  cpSync(directory, `dist/${directory}`, { recursive: true });
}
// Local compiled output shares the installed workspace dependencies. Container releases
// install production dependencies and execute erasable TypeScript directly on Node 24.
for (const project of ['apps/server', 'packages/protocol', 'packages/domain', 'packages/db']) {
  cpSync(`${project}/package.json`, `dist/${project}/package.json`);
  const dependencyPath = `dist/${project}/node_modules`;
  if (existsSync(`${project}/node_modules`) && !existsSync(dependencyPath)) symlinkSync(resolve(`${project}/node_modules`), dependencyPath, 'dir');
}

execFileSync('pnpm', ['--filter', '@monolab/web', 'build'], { stdio: 'inherit' });
cpSync('apps/web/dist', 'dist/apps/web/dist', { recursive: true });
