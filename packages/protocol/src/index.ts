import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import canonicalize from 'canonicalize';
import type { CommandEnvelope, CommandSubmission, Frame } from '../generated/types.ts';

export * from '../generated/types.ts';
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_FRAME_BYTES = 1024 * 1024;
// Leave room for the inventory page/cursor or dispatch/result frame wrapper.
export const MAX_ITEM_BYTES = MAX_FRAME_BYTES - 4096;
export const schema = JSON.parse(readFileSync(new URL('../schemas/v1/contracts.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ strict: true, allErrors: false });
ajv.addSchema(schema);
const validators = new Map<string, ReturnType<typeof ajv.compile>>();

export class ProtocolVersionError extends Error {}
export class ProtocolValidationError extends Error {}

export function validate<T>(name: string, value: unknown): T {
  if (['Frame', 'CommandEnvelope', 'OwnerCommand', 'OwnerLogin'].includes(name) && value && typeof value === 'object' && 'schema_version' in value && value.schema_version !== 1) throw new ProtocolVersionError('Unsupported schema version');
  let validator = validators.get(name);
  if (!validator) {
    validator = ajv.compile({ $ref: `${schema.$id}#/definitions/${name}` });
    validators.set(name, validator);
  }
  if (!validator(value)) throw new ProtocolValidationError(`Invalid ${name}: ${ajv.errorsText(validator.errors, { dataVar: 'body' })}`);
  const limit = ['Frame', 'RunnerInventory'].includes(name) ? MAX_FRAME_BYTES : ['Dispatch', 'Operation', 'OperationResult'].includes(name) ? MAX_ITEM_BYTES : undefined;
  if (limit !== undefined && Buffer.byteLength(JSON.stringify(value)) > limit) throw new ProtocolValidationError(`${name} exceeds the encoded wire byte limit`);
  return value as T;
}

export function canonicalJSON(value: unknown): string {
  // RFC 8785 requires Unicode scalar values. JSON.stringify would preserve lone
  // surrogates, while Go's decoder replaces them, changing the journaled digest.
  assertUnicode(value);
  const result = canonicalize(value);
  if (result === undefined) throw new Error('Value has no JSON representation');
  return result;
}

function assertUnicode(value: unknown): void {
  if (typeof value === 'string' && /[\uD800-\uDFFF]/u.test(value)) throw new ProtocolValidationError('JSON strings must contain well-formed Unicode');
  if (Array.isArray(value)) value.forEach(assertUnicode);
  else if (value && typeof value === 'object') {
    for (const [key, member] of Object.entries(value)) { assertUnicode(key); assertUnicode(member); }
  }
}

export function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function submission(envelope: CommandEnvelope): CommandSubmission {
  validateEnvelope(envelope);
  const envelope_json = canonicalJSON(envelope);
  return { envelope_json, sha256: digest(envelope_json) };
}

export function parseSubmission(body: unknown): { submission: CommandSubmission; envelope: CommandEnvelope } {
  const request = validate<CommandSubmission>('CommandSubmission', body);
  if (Buffer.byteLength(request.envelope_json) > 1048576 || digest(request.envelope_json) !== request.sha256) throw new Error('Envelope size or digest mismatch');
  const envelope = JSON.parse(request.envelope_json) as unknown;
  validateEnvelope(envelope);
  if (canonicalJSON(envelope) !== request.envelope_json) throw new Error('Envelope must use RFC 8785 canonical JSON');
  return { submission: request, envelope };
}

export function validateEnvelope(value: unknown): asserts value is CommandEnvelope {
  validate<CommandEnvelope>('CommandEnvelope', value);
}

export function parseFrame(value: unknown): Frame {
  return validate<Frame>('Frame', value);
}
