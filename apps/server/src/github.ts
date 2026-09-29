import { createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey, hkdfSync, randomBytes, sign } from 'node:crypto';
import type { Transaction } from '../../../packages/db/src/index.ts';
import { CommandError } from '../../../packages/domain/src/commands.ts';
import { validate } from '../../../packages/protocol/src/index.ts';
import type { GitHubConfigurationInput, GitHubRepositoryPage } from '../../../packages/protocol/src/index.ts';
import { repositoryIdentity, validateGitRef } from '../../../packages/domain/src/repositories.ts';

// Persisted v1 ciphertext depends on these exact salt bytes. They are a storage
// contract, independent of product branding; changing them requires key migration.
const providerKeySaltV1 = Buffer.from('6d6f6e6f6c61622d70726f7669646572', 'hex');

export interface GitHubCredentials { app_id: string; installation_id: string; encrypted_key: string; key_fingerprint: string }
export class GitHub {
  private readonly key: Buffer;
  private readonly fetcher: typeof fetch;
  constructor(signingKey: string, fetcher: typeof fetch = fetch) {
    if (Buffer.byteLength(signingKey) < 32) throw new Error('Provider encryption requires the private service signing key');
    this.key = Buffer.from(hkdfSync('sha256', signingKey, providerKeySaltV1, 'github-private-key-v1', 32));
    this.fetcher = fetcher;
  }
  private aad(config: Pick<GitHubCredentials, 'app_id' | 'installation_id'>) { return Buffer.from(`github:v1:${config.app_id}:${config.installation_id}`); }
  private encrypt(pem: string, config: Pick<GitHubCredentials, 'app_id' | 'installation_id'>): string {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv); cipher.setAAD(this.aad(config));
    const encrypted = Buffer.concat([cipher.update(pem, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64url')).join('.');
  }
  private decrypt(config: GitHubCredentials): string {
    try {
      const [iv, tag, encrypted] = config.encrypted_key.split('.').map((v) => Buffer.from(v, 'base64url'));
      if (!iv || !tag || !encrypted) throw new Error();
      const cipher = createDecipheriv('aes-256-gcm', this.key, iv); cipher.setAAD(this.aad(config)); cipher.setAuthTag(tag);
      return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8');
    } catch { throw new CommandError('unmet_precondition', 'Provider key cannot be read; re-enter the GitHub App key after service key rotation'); }
  }
  async configure(tx: Transaction, config: GitHubConfigurationInput): Promise<void> {
    const old = (await tx.query<GitHubCredentials>('SELECT app_id,installation_id,encrypted_key,key_fingerprint FROM github_configuration')).rows[0];
    if (!config.private_key && (!old || old.app_id !== config.app_id)) throw new CommandError('invalid_input', 'A private key is required for this GitHub App');
    const pem = config.private_key ?? this.decrypt(old!);
    let fingerprint: string;
    try {
      const key = createPrivateKey(pem);
      if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error();
      fingerprint = createHash('sha256').update(createPublicKey(key).export({ type: 'spki', format: 'der' })).digest('hex');
    } catch { throw new CommandError('invalid_input', 'Use an unencrypted RSA GitHub App private key of at least 2048 bits'); }
    await tx.query('INSERT INTO github_configuration(singleton,app_id,installation_id,encrypted_key,key_fingerprint) VALUES(true,$1,$2,$3,$4) ON CONFLICT(singleton) DO UPDATE SET app_id=$1,installation_id=$2,encrypted_key=$3,key_fingerprint=$4', [config.app_id, config.installation_id, this.encrypt(pem, config), fingerprint]);
  }
  private async request(path: string, token: string, body?: unknown): Promise<unknown> {
    try {
      const response = await this.fetcher(`https://api.github.com${path}`, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'monos', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) { await response.body?.cancel(); throw new CommandError('unmet_precondition', response.status === 401 || response.status === 403 ? 'GitHub access denied; check App installation and repository permissions' : 'GitHub repository access is unavailable; retry later'); }
      if (!response.body) throw new Error();
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          size += chunk.value.length; if (size > 1024 * 1024) throw new Error();
          chunks.push(chunk.value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      } finally { await reader.cancel(); }
    } catch (error) {
      if (error instanceof CommandError) throw error;
      throw new CommandError('unmet_precondition', 'GitHub returned no valid bounded response; check connectivity and retry');
    }
  }
  async repositories(config: GitHubCredentials, page: number): Promise<GitHubRepositoryPage> {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new CommandError('invalid_input', 'Repository page must be between 1 and 1000');
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: config.app_id })}`;
    const jwt = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), this.decrypt(config)).toString('base64url')}`;
    const result = await this.request(`/app/installations/${config.installation_id}/access_tokens`, jwt, { permissions: { contents: 'read', metadata: 'read' } });
    if (!result || typeof result !== 'object' || !('token' in result) || typeof result.token !== 'string' || !result.token || result.token.length > 4096) throw new CommandError('unmet_precondition', 'GitHub did not issue an installation token');
    const raw = await this.request(`/installation/repositories?per_page=100&page=${page}`, result.token);
    try {
      if (!raw || typeof raw !== 'object' || !('repositories' in raw) || !Array.isArray(raw.repositories) || raw.repositories.length > 100) throw new Error();
      const repositories = raw.repositories.map((value: unknown) => {
        if (!value || typeof value !== 'object') throw new Error();
        const repo = value as Record<string, unknown>;
        if (!Number.isSafeInteger(repo.id) || Number(repo.id) < 1 || typeof repo.full_name !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.full_name) || typeof repo.clone_url !== 'string' || typeof repo.default_branch !== 'string' || typeof repo.private !== 'boolean') throw new Error();
        if (repositoryIdentity(repo.clone_url) !== `github.com/${repo.full_name.toLowerCase()}`) throw new Error();
        validateGitRef(repo.default_branch);
        return { provider_repo_id: String(repo.id), full_name: repo.full_name, remote_url: repo.clone_url, default_branch: repo.default_branch, private: repo.private };
      });
      return validate('GitHubRepositoryPage', { schema_version: 1, repositories, ...(repositories.length === 100 && page < 1000 ? { next_page: page + 1 } : {}) });
    } catch { throw new CommandError('unmet_precondition', 'GitHub repository metadata is invalid or exceeds supported limits'); }
  }
}
