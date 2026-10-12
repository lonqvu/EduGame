import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests of the games against a running app: `npm run dev` (frontend) plus the backend and PostgreSQL
 * with the dev seed (teacher colan@edugame.local / 123456). Each test signs in its own session (refresh tokens rotate,
 * so tests cannot share one) and makes its own games, archived after.
 *
 *   npm run e2e                     # E2E_BASE_URL / E2E_API_URL to point elsewhere
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    // The projector stage is laid out for 1280x720.
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } }],
})
