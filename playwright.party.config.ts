import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  testMatch: /party-(host|room)\.spec\.ts/,
  outputDir: './test-results/party',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: { channel: 'chrome', trace: 'retain-on-failure' },
});
