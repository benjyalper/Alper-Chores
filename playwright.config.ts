import { defineConfig, devices } from '@playwright/test';

// E2E tests run against a locally started production server backed by a
// DEDICATED test database — never the production Railway database. Provide
// TEST_DATABASE_URL (or a local DATABASE_URL) before running `npm run test:e2e`.
const PORT = process.env.E2E_PORT || '3100';
const DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: DB
    ? {
        command: `cross-env NODE_ENV=production PORT=${PORT} tsx server/src/index.ts`,
        url: `http://localhost:${PORT}/api/health`,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
        env: {
          DATABASE_URL: DB,
          NODE_ENV: 'production',
          PORT,
        },
      }
    : undefined,
});
