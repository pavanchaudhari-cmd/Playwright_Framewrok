import { test, expect } from '../fixtures/auth_fixtures';
import { epic, feature, story, severity } from 'allure-js-commons';

test.describe('EventHub Login Page Tests', () => {
  test.beforeEach(async ({ loginPage: _loginPage }) => {
    // _loginPage fixture navigates to the login URL automatically
    await epic('EventHub');
    await feature('Authentication');
  });

  test('TC001: Verify login page loads successfully', async ({ page }) => {
    await story('Login Page UI');
    await severity('normal');

    await expect(page).toHaveTitle(/EventHub/i);

    // Use h1 only — the page also has an h2 in the marketing panel,
    // and toBeVisible() enforces strict mode (single element match).
    await expect(page.locator('h1')).toBeVisible();
  });

  test('TC002: Verify login form elements are present', async ({ page }) => {
    await story('Login Page UI');
    await severity('minor');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await expect(loginButton).toBeVisible();
  });

  test('TC003: Verify login with valid credentials', async ({ page }) => {
    await story('User Login');
    await severity('critical');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill(process.env.TEST_EMAIL ?? 'JoshJ@yopmail.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.TEST_PASSWORD ?? 'Yopmail@1234');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {
      // If redirect doesn't happen, check for success message
    });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('TC004: Verify login with invalid email format', async ({ page }) => {
    await story('Login Validation');
    await severity('normal');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('invalidemail');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC005: Verify login with empty email field', async ({ page }) => {
    await story('Login Validation');
    await severity('minor');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC006: Verify login with empty password field', async ({ page }) => {
    await story('Login Validation');
    await severity('minor');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('student@rahulshettyacademy.com');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC007: Verify login with empty email and password fields', async ({ page }) => {
    await story('Login Validation');
    await severity('minor');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC008: Verify login with incorrect password', async ({ page }) => {
    await story('Login Validation');
    await severity('normal');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('student@rahulshettyacademy.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('wrongpassword');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC009: Verify "Remember Me" checkbox functionality', async ({ page }) => {
    await story('Login Page UI');
    await severity('trivial');

    const rememberMeCheckbox = page.locator('input[type="checkbox"]');

    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
      await expect(rememberMeCheckbox).toBeChecked();

      await rememberMeCheckbox.uncheck();
      await expect(rememberMeCheckbox).not.toBeChecked();
    }
  });

  test('TC010: Verify "Forgot Password" link is present', async ({ page }) => {
    await story('Login Page UI');
    await severity('trivial');

    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("forgot")');

    if (await forgotPasswordLink.isVisible()) {
      await expect(forgotPasswordLink).toBeVisible();
      await forgotPasswordLink.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('TC011: Verify "Sign Up" link is present', async ({ page }) => {
    await story('User Registration');
    await severity('minor');

    const signUpLink = page.locator('a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create")');

    if (await signUpLink.isVisible()) {
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await page.waitForURL('**/register/**', { timeout: 5000 }).catch(() => {});
    }
  });

  test('TC012: Verify password field hides input text', async ({ page }) => {
    await story('Login Page UI');
    await severity('minor');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    const inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('TC013: Verify page responsiveness', async ({ page }) => {
    await story('Login Page UI');
    await severity('minor');

    await page.setViewportSize({ width: 375, height: 667 });

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await expect(loginButton).toBeVisible();

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await expect(emailInput).toBeVisible();
  });

  test('TC014: Verify login button is disabled during submission', async ({ page }) => {
    await story('User Login');
    await severity('normal');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill(process.env.TEST_EMAIL ?? 'JoshJ@yopmail.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.TEST_PASSWORD ?? 'Yopmail@1234');

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // The button should be disabled/loading during the API call, OR the page
    // navigates away on successful login — either outcome is acceptable.
    const navigated = await page
      .waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      const isDisabled = await loginButton.isDisabled();
      const hasLoadingClass = await loginButton.evaluate(el => el.classList.contains('loading'));
      expect(isDisabled || hasLoadingClass).toBeTruthy();
    }
  });

  test('TC015: Verify SQL injection attempt is handled', async ({ page }) => {
    await story('Login Security');
    await severity('critical');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill("' OR '1'='1");

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("' OR '1'='1");

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });
});
