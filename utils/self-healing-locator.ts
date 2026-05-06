import { type Page, type Locator } from '@playwright/test';

// ─── Core Utilities ───────────────────────────────────────────────────────────

/**
 * Returns a Playwright locator that chains all strategies with `.or()`.
 * Playwright resolves whichever one is present in the DOM at action time.
 * Use this for synchronous locator access (works directly with `expect()`).
 */
export function chain(page: Page, strategies: Array<(p: Page) => Locator>): Locator {
  let loc = strategies[0](page);
  for (let i = 1; i < strategies.length; i++) {
    loc = loc.or(strategies[i](page));
  }
  return loc;
}

/**
 * Probes each strategy in order (short timeout) and returns the first one
 * attached to the DOM. Logs a warning when a fallback strategy is used.
 * Use this when you need to know *which* strategy succeeded.
 */
export async function healAsync(
  page: Page,
  label: string,
  strategies: Array<{ name: string; fn: (p: Page) => Locator }>,
  probeTimeout = 500,
): Promise<Locator> {
  for (let i = 0; i < strategies.length; i++) {
    const { name, fn } = strategies[i];
    try {
      const loc = fn(page);
      await loc.waitFor({ state: 'attached', timeout: probeTimeout });
      if (i > 0) {
        console.warn(
          `[SelfHealing] "${label}" healed via "${name}" (strategy ${i + 1}/${strategies.length})`,
        );
      }
      return loc;
    } catch {
      // try next strategy
    }
  }
  // All probes exhausted — return last strategy and let Playwright produce the error
  console.warn(`[SelfHealing] "${label}": all ${strategies.length} strategies exhausted`);
  return strategies[strategies.length - 1].fn(page);
}

// ─── EventHub Login Locators ──────────────────────────────────────────────────

export const EventHubLogin = {
  emailInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('you@email.com'),
      (p) => p.getByLabel(/email/i),
      (p) => p.locator('input[type="email"]'),
    ]),

  passwordInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('••••••'),
      (p) => p.getByLabel(/^password$/i),
      (p) => p.locator('input[type="password"]'),
    ]),

  signInButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: /sign in/i }),
      (p) => p.getByRole('button', { name: /login/i }),
      (p) => p.locator('button[type="submit"]'),
    ]),

  registerLink: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('link', { name: /register/i }),
      (p) => p.getByText(/create an account/i),
      (p) => p.locator('a[href*="register"]'),
    ]),

  forgotPasswordLink: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('link', { name: /forgot/i }),
      (p) => p.getByText(/forgot password/i),
      (p) => p.locator('a[href*="forgot"]'),
    ]),

  errorMessage: (page: Page) =>
    chain(page, [
      (p) => p.locator('[role="alert"]'),
      (p) => p.locator('.error'),
      (p) => p.getByText(/invalid|incorrect|wrong|failed/i),
    ]),
} as const;

// ─── EventHub Registration Locators ──────────────────────────────────────────

export const EventHubRegistration = {
  emailInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('you@email.com'),
      (p) => p.getByLabel(/email/i),
      (p) => p.locator('input[type="email"]'),
    ]),

  passwordInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('Min 8 chars, uppercase, number & symbol'),
      (p) => p.getByLabel(/^password$/i),
      (p) => p.locator('input[type="password"]').first(),
    ]),

  confirmPasswordInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('Repeat your password'),
      (p) => p.getByLabel(/confirm password/i),
      (p) => p.locator('input[type="password"]').last(),
    ]),

  createAccountButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: /create account/i }),
      (p) => p.getByRole('button', { name: /register/i }),
      (p) => p.locator('button[type="submit"]'),
    ]),

  successMessage: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('heading', { name: /success|account created|verify/i }),
      (p) => p.getByText(/account created|registration successful|verify your email/i),
      (p) => p.locator('[role="alert"]').filter({ hasText: /success/i }),
    ]),

  validationError: (page: Page) =>
    chain(page, [
      (p) => p.locator('[role="alert"]'),
      (p) => p.getByText(/invalid|valid email|please enter a valid/i),
      (p) => p.locator('.error, .field-error'),
    ]),
} as const;

// ─── EventHub Navigation Locators ─────────────────────────────────────────────

export const EventHubNav = {
  homeLink: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('nav-home'),
      (p) => p.getByRole('link', { name: /^home$/i }),
      (p) => p.locator('a[href="/"]'),
    ]),

  eventsLink: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('nav-events'),
      (p) => p.getByRole('link', { name: /^events$/i }),
      (p) => p.locator('a[href*="/events"]'),
    ]),

  bookingsLink: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('nav-bookings'),
      (p) => p.getByRole('link', { name: /bookings/i }),
      (p) => p.locator('a[href*="/bookings"]'),
    ]),

  logoutButton: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('logout-btn'),
      (p) => p.getByRole('button', { name: /logout/i }),
      (p) => p.getByText(/log out|logout/i),
    ]),

  userEmailDisplay: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('user-email-display'),
      (p) => p.locator('[data-testid="user-email-display"]'),
      (p) => p.locator('nav').getByText(/@/),
    ]),
} as const;

// ─── EventHub Events Page Locators ────────────────────────────────────────────

export const EventHubEventsPage = {
  pageHeading: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('heading', { name: 'Upcoming Events', level: 1 }),
      (p) => p.getByRole('heading', { name: /upcoming events/i }),
      (p) => p.getByTestId('events-page-heading'),
    ]),

  searchInput: (page: Page) =>
    chain(page, [
      (p) => p.getByPlaceholder('Search events, venues…'),
      (p) => p.getByTestId('search-input'),
      (p) => p.locator('input[type="search"]'),
      (p) => p.getByRole('searchbox'),
    ]),

  categoryFilter: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('category-filter'),
      (p) => p.getByLabel(/category/i),
      (p) => p.locator('select').first(),
    ]),

  cityFilter: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('city-filter'),
      (p) => p.getByLabel(/city/i),
      (p) => p.locator('select').last(),
    ]),

  eventCards: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('event-card'),
      (p) => p.locator('[data-testid="event-card"]'),
      (p) => p.locator('.event-card'),
    ]),

  bookNowButton: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('book-now-btn'),
      (p) => p.locator('[data-testid="book-now-btn"]'),
      (p) => p.getByRole('link', { name: /book now/i }),
    ]),

  noResultsMessage: (page: Page) =>
    chain(page, [
      (p) => p.getByTestId('no-results-message'),
      (p) => p.getByText(/no events found/i),
      (p) => p.getByText(/no results/i),
    ]),
} as const;

// ─── EventHub Booking Page Locators ──────────────────────────────────────────

export const EventHubBooking = {
  bookingConfirmation: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('heading', { name: /booking confirmed|confirmation/i }),
      (p) => p.getByText(/booking confirmed|successfully booked/i),
      (p) => p.locator('[data-testid="booking-confirmation"]'),
    ]),

  proceedToCheckoutButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: /proceed to checkout|checkout/i }),
      (p) => p.getByRole('link', { name: /checkout/i }),
      (p) => p.locator('[data-testid="checkout-btn"]'),
    ]),

  myBookingsList: (page: Page) =>
    chain(page, [
      (p) => p.locator('[data-testid="booking-item"]'),
      (p) => p.locator('.booking-item'),
      (p) => p.locator('table tbody tr'),
    ]),

  cancelBookingButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: /cancel/i }),
      (p) => p.locator('[data-testid="cancel-booking-btn"]'),
      (p) => p.getByText(/cancel booking/i),
    ]),
} as const;

// ─── SauceDemo Login Locators ─────────────────────────────────────────────────

export const SauceDemoLogin = {
  usernameInput: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('textbox', { name: 'Username' }),
      (p) => p.getByPlaceholder('Username'),
      (p) => p.locator('#user-name'),
      (p) => p.locator('input[name="user-name"]'),
    ]),

  passwordInput: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('textbox', { name: 'Password' }),
      (p) => p.getByPlaceholder('Password'),
      (p) => p.locator('#password'),
      (p) => p.locator('input[name="password"]'),
    ]),

  loginButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: 'Login' }),
      (p) => p.locator('#login-button'),
      (p) => p.locator('input[type="submit"]'),
    ]),

  errorMessage: (page: Page) =>
    chain(page, [
      (p) => p.locator('[data-test="error"]'),
      (p) => p.locator('.error-message-container'),
      (p) => p.getByRole('alert'),
    ]),
} as const;

// ─── SauceDemo Inventory Locators ─────────────────────────────────────────────

export const SauceDemoInventory = {
  inventoryList: (page: Page) =>
    chain(page, [
      (p) => p.locator('.inventory_list'),
      (p) => p.locator('[data-test="inventory-list"]'),
      (p) => p.locator('#inventory_container'),
    ]),

  cartIcon: (page: Page) =>
    chain(page, [
      (p) => p.locator('.shopping_cart_link'),
      (p) => p.getByRole('link', { name: /cart/i }),
      (p) => p.locator('[data-test="shopping-cart-link"]'),
    ]),

  cartBadge: (page: Page) =>
    chain(page, [
      (p) => p.locator('.shopping_cart_badge'),
      (p) => p.locator('[data-test="shopping-cart-badge"]'),
    ]),

  addToCartButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: 'Add to cart' }),
      (p) => p.locator('[data-test*="add-to-cart"]'),
    ]),

  backToProductsButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: 'Back to products' }),
      (p) => p.getByText('Back to products'),
      (p) => p.locator('[data-test="back-to-products"]'),
    ]),

  sortDropdown: (page: Page) =>
    chain(page, [
      (p) => p.locator('.product_sort_container'),
      (p) => p.locator('[data-test="product-sort-container"]'),
      (p) => p.getByRole('combobox'),
    ]),

  burgerMenuButton: (page: Page) =>
    chain(page, [
      (p) => p.getByRole('button', { name: /open menu/i }),
      (p) => p.locator('#react-burger-menu-btn'),
      (p) => p.locator('.bm-burger-button button'),
    ]),
} as const;
