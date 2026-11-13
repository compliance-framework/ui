import { defineConfig } from '@playwright/test';

/**
 * Browser checks for the redesigned screens under /next (axe accessibility, reflow, keyboard),
 * run by `npm run test:e2e`. Every API call is mocked in the browser (e2e/support/api.ts), so no
 * backend is needed. Locally it uses the installed Chrome; in CI, Playwright's own Chromium
 * (`npx playwright install chromium`).
 */
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    // VITE_API_URL empty keeps API calls relative, so the browser-side mocks catch them.
    command: `npx vite --port ${port} --strictPort`,
    env: { VITE_API_URL: '', E2E: '1' },
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
