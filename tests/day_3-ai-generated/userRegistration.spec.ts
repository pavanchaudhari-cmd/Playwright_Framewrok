/* AI-GENERATED — Review required */

/*
 * NOTE: The registration form's <label> elements have no `for` attribute and do not
 * wrap their inputs, so getByLabel() cannot resolve them. getByPlaceholder() is used
 * instead as the semantic Playwright locator. getByRole() is used for the submit button.
 */

import { test, expect } from '../../fixtures/auth_fixtures';
import { epic, feature, story, severity } from 'allure-js-commons';

const BASE_URL = 'https://eventhub.rahulshettyacademy.com/';

test.describe('User Registration', { tag: ['@ui', '@auth', '@eventhub'] }, () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('link', { name: /register/i }).click();
    await page.waitForLoadState('networkidle');
    await epic('EventHub');
    await feature('Authentication');
  });

  test('TC01 - Fill registration form and create account', async ({ page }) => {
    await story('User Registration');
    await severity('critical');

    const uniqueEmail = `testuser_${Date.now()}@mailinator.com`;

    await page.getByPlaceholder('you@email.com').fill(uniqueEmail);
    await page.getByPlaceholder('Min 8 chars, uppercase, number & symbol').fill('Test@12345');
    await page.getByPlaceholder('Repeat your password').fill('Test@12345');

    await page.getByRole('button', { name: /create account/i }).click();

    // On success the app either redirects away from the register page or shows a success message
    await expect(page).not.toHaveURL(/register/i, { timeout: 10000 })
      .catch(async () => {
        // If URL doesn't change, expect a success/confirmation message
        await expect(
          page.getByRole('heading', { name: /success|account created|verify/i })
            .or(page.getByText(/account created|registration successful|verify your email/i))
        ).toBeVisible({ timeout: 10000 });
      });
  });

  test('TC02 - Invalid email pattern shows validation error', async ({ page }) => {
    await story('Registration Validation');
    await severity('normal');

    await page.getByPlaceholder('you@email.com').fill('invalid-email-format');
    await page.getByPlaceholder('Min 8 chars, uppercase, number & symbol').fill('Test@12345');
    await page.getByPlaceholder('Repeat your password').fill('Test@12345');

    await page.getByRole('button', { name: /create account/i }).click();

    const emailInput = page.getByPlaceholder('you@email.com');

    // Check native HTML5 browser validation on the email input (type="email")
    const nativeValidationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    const hasNativeError = nativeValidationMessage.length > 0;

    // Also check for any custom in-page error messages
    const hasCustomError = await page
      .locator('text=/invalid|valid email|please enter a valid/i')
      .isVisible()
      .catch(() => false);

    expect(
      hasNativeError || hasCustomError,
      `Expected a validation error but got none. validationMessage="${nativeValidationMessage}"`
    ).toBeTruthy();
  });
});
