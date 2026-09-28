import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('probe certificates satisfy strict TLS verification and preparation preserves existing state', () => {
  const directory = mkdtempSync(join(tmpdir(), 'monolab-probe-tls-'));
  try {
    const script = join(directory, 'prepare.mjs');
    copyFileSync(new URL('./prepare.mjs', import.meta.url), script);
    execFileSync(process.execPath, [script], { stdio: 'pipe' });
    const privateDirectory = join(directory, 'private');
    const verify = ['verify', '-x509_strict', '-purpose', 'sslserver', '-CAfile', 'ca.crt'];
    for (const identity of [['-verify_ip', '127.0.0.1'], ['-verify_hostname', 'localhost']]) {
      execFileSync('openssl', [...verify, ...identity, 'server.crt'], { cwd: privateDirectory, stdio: 'pipe' });
    }
    const wrongHost = spawnSync('openssl', [...verify, '-verify_hostname', 'unrelated.example', 'server.crt'], { cwd: privateDirectory });
    assert.ifError(wrongHost.error);
    assert.notEqual(wrongHost.status, 0, 'the certificate must remain localhost-only');
    assert.equal(statSync(privateDirectory).mode & 0o777, 0o700);
    for (const name of ['ca.key', 'server.key', 'db_password', 'database_url', 'signing_key', 'runner_credential']) {
      assert.equal(statSync(join(privateDirectory, name)).mode & 0o777, 0o600);
    }
    const before = new Map(readdirSync(privateDirectory).map(name => [name, readFileSync(join(privateDirectory, name))]));
    const repeated = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    assert.ifError(repeated.error);
    assert.notEqual(repeated.status, 0);
    assert.match(repeated.stderr, /Private directory already exists; preserving it/);
    assert.deepEqual(readdirSync(privateDirectory), [...before.keys()]);
    for (const [name, bytes] of before) assert.deepEqual(readFileSync(join(privateDirectory, name)), bytes);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
