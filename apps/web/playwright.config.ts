import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:18555', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'node --experimental-strip-types ../server/test/fixtures/web-server.ts', url: 'http://127.0.0.1:18555', reuseExistingServer: false, timeout: 30000 },
  reporter: [['list']],
});
