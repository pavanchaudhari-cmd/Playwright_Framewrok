import dotenv from 'dotenv';
import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

dotenv.config();

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'JoshJ@yopmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Yopmail@1234';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL   ?? 'pavan.chaudhari@jeavio.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Nikecr@777';

// The auth endpoint is always on the API host regardless of which project runs the fixture.
const AUTH_ENDPOINT = 'https://api.eventhub.rahulshettyacademy.com/api/auth/login';

async function fetchToken(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(AUTH_ENDPOINT, { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Auth failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.token as string;
}

async function loginUI(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

export type AuthFixtures = {
  /** LoginPage instance navigated to the login URL — use for login-form tests. */
  loginPage: LoginPage;
  /** Browser page already authenticated as the regular test user. */
  authenticatedPage: Page;
  /** Browser page already authenticated as the admin user. */
  adminPage: Page;
  /** JWT bearer token for the regular test user (API tests). */
  apiToken: string;
  /** JWT bearer token for the admin user (API tests). */
  adminApiToken: string;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await use(lp);
  },

  authenticatedPage: async ({ page }, use) => {
    await loginUI(page, TEST_EMAIL, TEST_PASSWORD);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await loginUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(page);
  },

  apiToken: async ({ request }, use) => {
    const token = await fetchToken(request, TEST_EMAIL, TEST_PASSWORD);
    await use(token);
  },

  adminApiToken: async ({ request }, use) => {
    const token = await fetchToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(token);
  },
});

export { expect };
