import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'node tests/serve.js',
    url: 'http://127.0.0.1:4173/style.css',
    reuseExistingServer: true,
  },
});
