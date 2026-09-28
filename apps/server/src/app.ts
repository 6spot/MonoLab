import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CommandError } from '../../../packages/domain/src/commands.ts';
import { MAX_BODY_BYTES, MAX_FRAME_BYTES, parseFrame, ProtocolValidationError, ProtocolVersionError, validate } from '../../../packages/protocol/src/index.ts';
import type { CommandResult, Frame, InventoryQuery } from '../../../packages/protocol/src/index.ts';
import type { BoundaryService } from './service.ts';
import { OwnerCommands } from './owner-commands.ts';

function bearer(request: { headers: { authorization?: string } }): string {
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization ?? '');
  if (!match) throw new CommandError('unauthorized', 'Bearer authentication required');
  return match[1]!;
}

function errorResult(error: unknown): CommandResult {
  if (error instanceof ProtocolVersionError) return { schema_version: 1, status: 'error', error: { code: 'unsupported_version', message: 'Unsupported protocol version' } };
  if (error instanceof ProtocolValidationError) return { schema_version: 1, status: 'error', error: { code: 'invalid_input', message: 'Request does not match the protocol schema' } };
  if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415)) return { schema_version: 1, status: 'error', error: { code: 'invalid_input', message: 'Malformed, unsupported or oversized request body' } };
  return { schema_version: 1, status: 'error', error: error instanceof CommandError ? error.detail : { code: 'internal_error', message: 'Internal operation failed; reconcile existing request before retry' } };
}

export function createApp(service: BoundaryService, tls?: { key: Buffer; cert: Buffer }) {
  const app = Fastify({ ...(tls ? { https: tls } : {}), bodyLimit: MAX_BODY_BYTES, logger: { level: 'warn', redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'] }, disableRequestLogging: true });
  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    const result = errorResult(error);
    const code = result.error!.code;
    void reply.code(code === 'unauthorized' ? 401 : code === 'denied_scope' ? 403 : code === 'internal_error' ? 500 : 409).send(result);
  });
  app.get('/health', async () => { await service.db.pool.query('SELECT 1'); return { schema_version: 1, database: 'ready', probe: true }; });
  const owner = new OwnerCommands(service.db);
  app.post('/v1/owner/commands', async (request) => owner.confirm(bearer(request), request.body));
  app.get<{ Params: { scope_id: string; request_id: string } }>('/v1/owner/scopes/:scope_id/commands/:request_id', async (request) => owner.status(bearer(request), request.params.scope_id, request.params.request_id));
  app.post('/v1/commands', async (request) => service.admit(bearer(request), request.body));
  app.get<{ Params: { request_id: string } }>('/v1/commands/:request_id', async (request) => service.commandStatus(bearer(request), validate<string>('Id', request.params.request_id)));
  app.get<{ Querystring: InventoryQuery }>('/v1/runner/inventory', async (request) => {
    validate('InventoryQuery', request.query);
    return service.inventory(await service.authenticateRunner(bearer(request)), request.query.after, request.query.snapshot_id);
  });
  app.get<{ Params: { attempt_id: string; request_id: string } }>('/v1/recovery/attempts/:attempt_id/commands/:request_id', async (request) => service.recoverCommand(await service.authenticateRunner(bearer(request)), validate<string>('Id', request.params.attempt_id), validate<string>('Id', request.params.request_id)));
  app.get<{ Params: { operation_id: string } }>('/v1/recovery/operations/:operation_id', async (request) => service.recoverOperation(await service.authenticateRunner(bearer(request)), validate<string>('Id', request.params.operation_id)));

  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  app.server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/v1/runner') { socket.destroy(); return; }
    void Promise.resolve().then(() => service.authenticateRunner(bearer(request))).then((runnerId) => {
      sockets.handleUpgrade(request, socket, head, (ws) => attach(ws, runnerId));
    }).catch(() => { socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); socket.destroy(); });
  });

  function attach(ws: WebSocket, runnerId: string): void {
    let incarnation: number | undefined;
    let processing = Promise.resolve();
    let polling = false;
    let queuedMessages = 0;
    let queuedBytes = 0;
    const send = (frame: Frame) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      validate('Frame', frame);
      const body = JSON.stringify(frame);
      if (ws.bufferedAmount + Buffer.byteLength(body) > 4 * MAX_BODY_BYTES) { ws.close(4008, 'Control output backlog exceeded'); return; }
      ws.send(body);
    };
    const poll = setInterval(() => {
      if (incarnation === undefined || polling || ws.readyState !== WebSocket.OPEN) return;
      polling = true;
      void service.pending(runnerId, incarnation).then((frames) => frames.forEach(send)).catch(() => ws.close(4001, 'Control connection unavailable')).finally(() => { polling = false; });
    }, 250);
    poll.unref();
    const helloDeadline = setTimeout(() => { if (incarnation === undefined) ws.close(4000, 'Version handshake required'); }, 5000);
    helloDeadline.unref();
    ws.on('message', (data) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const body = data.toString();
      const bytes = Buffer.byteLength(body);
      if (queuedMessages >= 64 || queuedBytes + bytes > 4 * MAX_BODY_BYTES) { ws.close(4008, 'Control input backlog exceeded'); return; }
      queuedMessages++; queuedBytes += bytes;
      processing = processing.then(async () => {
        // Closing a socket invalidates queued heartbeats/requests immediately;
        // draining a stalled queue must not revive its persisted availability.
        if (ws.readyState !== WebSocket.OPEN) return;
        let frame: Frame;
        try { frame = parseFrame(JSON.parse(body)); } catch { ws.close(4000, 'Invalid or incompatible frame'); return; }
        if (incarnation === undefined) {
          if (frame.type !== 'hello' || frame.runner_id !== runnerId) { ws.close(4003, 'Invalid Runner identity'); return; }
          incarnation = await service.connect(runnerId, frame.boot_id!);
          send({ schema_version: 1, type: 'welcome', runner_id: runnerId, incarnation });
          return;
        }
        if (frame.incarnation !== incarnation) throw new CommandError('stale_execution', 'Wrong connection incarnation');
        try {
          switch (frame.type) {
            case 'ready': await service.touch(runnerId, incarnation, true); break;
            case 'heartbeat': await service.touch(runnerId, incarnation); break;
            case 'authorize_dispatch': {
              const grant = await service.authorize(runnerId, incarnation, frame.dispatch_id!);
              send({ schema_version: 1, type: 'authorization', incarnation, correlation_id: frame.correlation_id!, allowed: grant !== null, ...(grant ?? {}) });
              break;
            }
            case 'event':
              await service.event(runnerId, incarnation, frame.event!);
              send({ schema_version: 1, type: 'event_ack', incarnation, attempt_id: frame.event!.attempt_id, stream_id: frame.event!.stream_id, sequence: frame.event!.sequence });
              break;
            case 'operation_result':
              await service.finishOperation(runnerId, incarnation, frame.operation_result!);
              send({ schema_version: 1, type: 'operation_ack', incarnation, operation_id: frame.operation_result!.operation_id });
              break;
            default: throw new CommandError('invalid_input', 'Frame is not a Runner request');
          }
        } catch (error) {
          send({ schema_version: 1, type: 'error', incarnation, error: errorResult(error).error!, ...(frame.correlation_id ? { correlation_id: frame.correlation_id } : {}) });
        }
      }).catch(() => ws.close(4001, 'Control request failed')).finally(() => { queuedMessages--; queuedBytes -= bytes; });
    });
    ws.on('error', () => { /* Close handler owns reconciliation; no raw errors or credentials logged. */ });
    ws.on('close', () => {
      clearInterval(poll); clearTimeout(helloDeadline);
      if (incarnation !== undefined) void service.disconnect(runnerId, incarnation).catch(() => undefined);
      // A hello already waiting on the database can finish after socket close.
      void processing.finally(async () => { if (incarnation !== undefined) await service.disconnect(runnerId, incarnation); }).catch(() => undefined);
    });
  }
  app.addHook('onClose', async () => {
    for (const ws of sockets.clients) ws.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
  });
  return app;
}
