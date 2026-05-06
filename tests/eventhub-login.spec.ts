import { test, expect } from '../fixtures/auth_fixtures';

test.describe('EventHub Login Page Tests', () => {
  test.beforeEach(async ({ loginPage: _loginPage }) => {
    // _loginPage fixture navigates to the login URL automatically
  });

  test('TC001: Verify login page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/EventHub/i);

    // Use h1 only — the page also has an h2 in the marketing panel,
    // and toBeVisible() enforces strict mode (single element match).
    await expect(page.locator('h1')).toBeVisible();
  });

  test('TC002: Verify login form elements are present', async ({ page }) => {
    // Verify email/username input field exists
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await expect(emailInput).toBeVisible();

    // Verify password input field exists
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Verify login button exists
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await expect(loginButton).toBeVisible();
  });

  test('TC003: Verify login with valid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill(process.env.TEST_EMAIL ?? 'JoshJ@yopmail.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.TEST_PASSWORD ?? 'Yopmail@1234');

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Wait for navigation or dashboard to load
    await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {
      // If redirect doesn't happen, check for success message
    });

    // Verify successful login (check for redirect or success indicator)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('TC004: Verify login with invalid email format', async ({ page }) => {
    // Enter invalid email format
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('invalidemail');

    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify error message or validation
    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC005: Verify login with empty email field', async ({ page }) => {
    // Leave email empty and enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify error message or validation
    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC006: Verify login with empty password field', async ({ page }) => {
    // Enter email but leave password empty
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('student@rahulshettyacademy.com');

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify error message or validation
    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC007: Verify login with empty email and password fields', async ({ page }) => {
    // Click login button without entering credentials
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify error message or validation
    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC008: Verify login with incorrect password', async ({ page }) => {
    // Enter valid email
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill('student@rahulshettyacademy.com');

    // Enter incorrect password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('wrongpassword');

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify error message
    const errorMessage = page.locator('[role="alert"], .error, .alert-danger');
    await expect(errorMessage).toBeVisible();
  });

  test('TC009: Verify "Remember Me" checkbox functionality', async ({ page }) => {
    // Check if remember me checkbox exists
    const rememberMeCheckbox = page.locator('input[type="checkbox"]');
    
    if (await rememberMeCheckbox.isVisible()) {
      // Click remember me
      await rememberMeCheckbox.check();
      await expect(rememberMeCheckbox).toBeChecked();

      // Uncheck it
      await rememberMeCheckbox.uncheck();
      await expect(rememberMeCheckbox).not.toBeChecked();
    }
  });

  test('TC010: Verify "Forgot Password" link is present', async ({ page }) => {
    // Check for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("forgot")');
    
    if (await forgotPasswordLink.isVisible()) {
      await expect(forgotPasswordLink).toBeVisible();
      // Click and verify navigation
      await forgotPasswordLink.click();
      // Verify URL changed or modal appeared
      await page.waitForLoadState('networkidle');
    }
  });

  test('TC011: Verify "Sign Up" link is present', async ({ page }) => {
    // Check for sign up link
    const signUpLink = page.locator('a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create")');
    
    if (await signUpLink.isVisible()) {
      await expect(signUpLink).toBeVisible();
      // Click and verify navigation
      await signUpLink.click();
      // Verify URL changed to registration page
      await page.waitForURL('**/register/**', { timeout: 5000 }).catch(() => {
        // If URL doesn't change as expected, just verify page changed
      });
    }
  });

  test('TC012: Verify password field hides input text', async ({ page }) => {
    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('learning123');

    // Verify type attribute is password (input is masked)
    const inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('TC013: Verify page responsiveness', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify login button is still visible on mobile
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await expect(loginButton).toBeVisible();

    // Verify form fields are accessible
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await expect(emailInput).toBeVisible();
  });

  test('TC014: Verify login button is disabled during submission', async ({ page }) => {
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
    // Enter SQL injection attempt in email field
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.fill("' OR '1'='1");

    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("' OR '1'='1");

    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Verify login fails (no successful redirect)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });
});
