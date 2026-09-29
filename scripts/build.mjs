import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs';
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
  const installedPath = resolve(`${project}/node_modules`);
  const old = lstatSync(dependencyPath, { throwIfNoEntry: false });
  // A source-directory rename can leave a dangling link in generated output.
  // Replace only dangling links in generated output, never real directories.
  if (old?.isSymbolicLink() && !existsSync(dependencyPath)) unlinkSync(dependencyPath);
  if (existsSync(installedPath) && !lstatSync(dependencyPath, { throwIfNoEntry: false })) symlinkSync(installedPath, dependencyPath, 'dir');
}

execFileSync('pnpm', ['--filter', '@monos/web', 'build'], { stdio: 'inherit' });
cpSync('apps/web/dist', 'dist/apps/web/dist', { recursive: true });
