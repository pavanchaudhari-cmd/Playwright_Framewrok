import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL;
const UI_BASE_URL  = process.env.UI_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['monocart-reporter', {
      name: 'Playwright Test Report',
      outputFile: './monocart-report/index.html',
      columns: (defaultColumns: object[]) => defaultColumns,
    }],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: false }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: ['**/Day2.spec.ts', '**/eventhub-api.spec.ts'],
      use: {
        baseURL: API_BASE_URL,
      },
    },
    {
      name: 'db',
      testMatch: ['**/supabase-schema.spec.ts'],
    },
    {
      name: 'ui',
      testIgnore: ['**/Day2.spec.ts', '**/eventhub-api.spec.ts', '**/supabase-schema.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: UI_BASE_URL,
      },
    },
  ],
});