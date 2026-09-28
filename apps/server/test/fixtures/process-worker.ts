import { fork } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type { Dispatch } from '../../../../packages/protocol/src/index.ts';
import type { AttemptFixture } from '../../src/fixtures.ts';

export interface Message { type: string; pid?: number; dispatch?: Dispatch; code?: string }
export class Worker {
  child: ChildProcess;
  messages: Message[] = [];
  exited: Promise<void>;
  dead = false;
  constructor(url: string, entry = new URL('./claim-worker.ts', import.meta.url)) {
    this.child = fork(entry, [], {
      execArgv: ['--experimental-strip-types'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...process.env, DATABASE_URL: url },
    });
    this.child.on('message', (value: Message) => this.messages.push(value));
    this.child.on('error', () => { this.dead = true; });
    this.exited = new Promise((resolve) => this.child.once('close', () => { this.dead = true; resolve(); }));
  }
  async next(...types: string[]): Promise<Message> {
    for (let count = 0; count < 500; count++) {
      const index = this.messages.findIndex((message) => types.includes(message.type));
      if (index >= 0) return this.messages.splice(index, 1)[0]!;
      if (this.dead) throw new Error('Database worker exited before its checkpoint');
      await delay(10);
    }
    throw new Error(`Database worker did not reach ${types.join('/')} checkpoint`);
  }
  send(message: unknown) { this.child.send(message as object); }
  run(input: AttemptFixture, hold = false) { this.send({ input, hold }); }
  async stop() { if (!this.dead) this.child.kill('SIGKILL'); await this.exited; }
}
