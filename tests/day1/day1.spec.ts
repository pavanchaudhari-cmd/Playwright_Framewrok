// AI-generated: EventHub login test suite using the LoginPage POM
import { test, expect } from '../../fixtures/auth_fixtures';
import { epic, feature, story, severity } from 'allure-js-commons';

const EMAIL = process.env.TEST_EMAIL!;
const PASSWORD = process.env.TEST_PASSWORD!;

test.describe('EventHub Login Page', { tag: ['@ui', '@auth', '@eventhub'] }, () => {

  test.beforeEach(async () => {
    await epic('EventHub');
    await feature('Authentication');
  });

  test('TC001: login page loads with correct title and form elements', async ({ loginPage, page }) => {
    await story('Login Page UI');
    await severity('normal');
    await expect(page).toHaveTitle(/EventHub/i);

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('TC002: all form elements are present', async ({ loginPage }) => {
    await story('Login Page UI');
    await severity('minor');
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
    // EventHub login page has no "Forgot Password" link — only Register is present
  });

  test('TC003: valid credentials redirect away from login', async ({ loginPage, page }) => {
    await story('User Login');
    await severity('critical');
    await loginPage.login(EMAIL, PASSWORD);

    await expect(page).not.toHaveURL(/\/login/);
  });

  test('TC004: invalid email format shows validation error', async ({ loginPage }) => {
    await story('Login Validation');
    await severity('normal');
    await loginPage.fillEmail('notanemail');
    await loginPage.fillPassword(PASSWORD);
    await loginPage.clickSignIn();

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('TC005: empty email shows validation error', async ({ loginPage }) => {
    await story('Login Validation');
    await severity('minor');
    await loginPage.fillPassword(PASSWORD);
    await loginPage.clickSignIn();

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('TC006: empty password shows validation error', async ({ loginPage }) => {
    await story('Login Validation');
    await severity('minor');
    await loginPage.fillEmail(EMAIL);
    await loginPage.clickSignIn();

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('TC007: both fields empty shows validation error', async ({ loginPage }) => {
    await story('Login Validation');
    await severity('minor');
    await loginPage.clickSignIn();

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('TC008: wrong password shows error message', async ({ loginPage }) => {
    await story('Login Validation');
    await severity('normal');
    await loginPage.login(EMAIL, 'WrongPassword@99');

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('TC009: password field masks input', async ({ loginPage }) => {
    await story('Login Page UI');
    await severity('minor');
    await loginPage.fillPassword(PASSWORD);

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC010: forgot password link navigates away from login', async () => {
    await story('Login Page UI');
    await severity('trivial');
    test.skip(true, 'EventHub login page has no "Forgot Password" link — feature not implemented');
  });

  test('TC011: register link navigates to registration page', async ({ loginPage, page }) => {
    await story('User Registration');
    await severity('normal');
    await loginPage.clickRegister();

    await expect(page).toHaveURL(/register/);
  });

  test('TC012: form remains usable on mobile viewport', async ({ loginPage, page }) => {
    await story('Login Page UI');
    await severity('minor');
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('TC013: SQL injection attempt is rejected', async ({ loginPage, page }) => {
    await story('Login Security');
    await severity('critical');
    await loginPage.login("' OR '1'='1", "' OR '1'='1");

    await expect(page).toHaveURL(/\/login/);
  });
});
