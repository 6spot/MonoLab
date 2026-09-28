import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authenticateAttempt, issueAttemptCredential } from '../src/auth.ts';

const key = 'test-only-signing-key-never-for-deployment';
const identity = { attempt_id: 'attempt-a', dispatch_id: 'dispatch-a', fencing_generation: 1, expires: Date.now() + 60_000 };

function signed(body: string): string {
  const encoded = Buffer.from(body).toString('base64url');
  return `attempt.v1.${encoded}.${createHmac('sha256', key).update(`attempt.v1.${encoded}`).digest('base64url')}`;
}

describe('Attempt credentials', () => {
  it('authenticates an intact current identity and denies expired or forged signatures', () => {
    expect(authenticateAttempt(issueAttemptCredential(identity, key), key)).toEqual(identity);
    expect(() => authenticateAttempt(issueAttemptCredential({ ...identity, expires: 1 }, key), key)).toThrow('expired');
    expect(() => authenticateAttempt(issueAttemptCredential(identity, `${key}-other`), key)).toThrow('Invalid');
  });

  it('rejects extra segments, padded encoding and ignored base64 characters', () => {
    const token = issueAttemptCredential(identity, key);
    for (const malformed of [`${token}.`, `${token}..ignored`, `${token}=`, `${token}!`, token.replace('attempt.v1.', 'attempt.v2.')]) {
      expect(() => authenticateAttempt(malformed, key)).toThrow('Invalid');
    }
  });

  it.each([
    'null', '[]', '{', '{}',
    JSON.stringify({ ...identity, attempt_id: null }),
    JSON.stringify({ ...identity, dispatch_id: '../other' }),
    JSON.stringify({ ...identity, fencing_generation: 0 }),
    JSON.stringify({ ...identity, fencing_generation: '1' }),
    JSON.stringify({ ...identity, expires: '9999999999999' }),
    JSON.stringify({ ...identity, owner: true }),
  ])('maps malformed signed claims to authentication failure: %s', (body) => {
    expect(() => authenticateAttempt(signed(body), key)).toThrow(expect.objectContaining({ detail: { code: 'unauthorized', message: 'Invalid Attempt credential' } }));
  });
});
