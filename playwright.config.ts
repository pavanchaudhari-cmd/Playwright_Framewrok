import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.eventhub.rahulshettyacademy.com/api/docs/';
const UI_BASE_URL  = process.env.UI_BASE_URL  ?? 'https://eventhub.rahulshettyacademy.com/';

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
      name: 'ui',
      testIgnore: ['**/Day2.spec.ts', '**/eventhub-api.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: UI_BASE_URL,
      },
    },
  ],
});