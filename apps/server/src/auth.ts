import { createHmac, timingSafeEqual } from 'node:crypto';
import { CommandError } from '../../../packages/domain/src/commands.ts';
import { validate } from '../../../packages/protocol/src/index.ts';

export interface AttemptIdentity {
  attempt_id: string;
  dispatch_id: string;
  fencing_generation: number;
  expires: number;
}

export function issueAttemptCredential(identity: AttemptIdentity, signingKey: string): string {
  const body = Buffer.from(JSON.stringify(identity)).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(`attempt.v1.${body}`).digest('base64url');
  return `attempt.v1.${body}.${signature}`;
}

export function authenticateAttempt(token: string, signingKey: string): AttemptIdentity {
  const match = token.length <= 4096 ? /^attempt\.v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token) : null;
  if (!match) throw new CommandError('unauthorized', 'Invalid Attempt credential');
  const body = match[1]!;
  const signature = match[2]!;
  const expected = createHmac('sha256', signingKey).update(`attempt.v1.${body}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.toString('base64url') !== signature || expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new CommandError('unauthorized', 'Invalid Attempt credential');
  let identity: AttemptIdentity;
  try {
    const decoded = Buffer.from(body, 'base64url');
    if (decoded.toString('base64url') !== body) throw new Error('Noncanonical credential');
    const value: unknown = JSON.parse(decoded.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid identity');
    const fields = Object.keys(value);
    if (fields.length !== 4 || !fields.every((key) => ['attempt_id', 'dispatch_id', 'fencing_generation', 'expires'].includes(key))) throw new Error('Invalid identity fields');
    identity = value as AttemptIdentity;
    validate('Id', identity.attempt_id);
    validate('Id', identity.dispatch_id);
    if (!Number.isSafeInteger(identity.fencing_generation) || identity.fencing_generation < 1 || !Number.isSafeInteger(identity.expires) || identity.expires < 1) throw new Error('Invalid identity counters');
  } catch {
    throw new CommandError('unauthorized', 'Invalid Attempt credential');
  }
  if (identity.expires <= Date.now()) throw new CommandError('unauthorized', 'Attempt credential has expired');
  return identity;
}
