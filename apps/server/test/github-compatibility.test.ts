import { verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GitHub } from '../src/github.ts';
import type { GitHubCredentials } from '../src/github.ts';

it('uses a saved v1 provider key after a brand rename without re-entering credentials', async () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/github-v1-credentials.json', import.meta.url), 'utf8')) as {
    synthetic_signing_key: string; public_key: string; credentials: GitHubCredentials;
  };
  const requests: { url: string; authorization: string; userAgent: string }[] = [];
  const github = new GitHub(fixture.synthetic_signing_key, async (url, init) => {
    const headers = new Headers(init?.headers);
    requests.push({ url: String(url), authorization: headers.get('Authorization') ?? '', userAgent: headers.get('User-Agent') ?? '' });
    return new Response(JSON.stringify(requests.length === 1 ? { token: 'synthetic-installation-token' } : { repositories: [] }));
  });

  await expect(github.repositories(fixture.credentials, 1)).resolves.toEqual({ schema_version: 1, repositories: [] });
  expect(requests).toHaveLength(2);
  expect(requests[0]!.url).toBe('https://api.github.com/app/installations/456/access_tokens');
  expect(requests[0]!.userAgent).toBe('monos');
  const [header, payload, signature] = requests[0]!.authorization.slice('Bearer '.length).split('.');
  expect(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), fixture.public_key, Buffer.from(signature!, 'base64url'))).toBe(true);
  expect(requests[1]!.authorization).toBe('Bearer synthetic-installation-token');
});
