# skills/playwright-test-writer/SKILL.md

## What this skill does
Generates production-ready Playwright TypeScript test files specifically for
https://eventhub.rahulshettyacademy.com — covering authentication, event browsing,
booking flow, cart, checkout, and admin operations.
Read this file in full before writing any test code.

---

## Application Overview — EventHub

| Page / Module       | URL Path              | Key Actions                                      |
|---------------------|-----------------------|--------------------------------------------------|
| Landing / Home      | `/`                   | View hero banner, navigate to login/register     |
| Register            | `/register`           | New user signup (name, email, password)          |
| Login               | `/login`              | Email + password sign-in                         |
| Events Listing      | `/dashboard`          | Browse event cards, search/filter events         |
| Event Detail        | `/eventdetails/:id`   | View description, price, seats, "Book Now"       |
| Cart                | `/cart`               | Review booked events, adjust qty, remove         |
| Checkout            | `/checkout`           | Enter card details, confirm order                |
| My Bookings         | `/mybookings`         | List of past bookings, cancel option             |
| Admin — Create      | `/addevent`           | Create new event (name, date, price, seats)      |
| Admin — Manage      | `/eventmanagement`    | Edit / delete existing events                    |

---

## Non-Negotiable Rules

1. **Selectors** — always prefer in this order (see full priority table below):
   - `getByRole()` first, `getByLabel()` second, then `getByPlaceholder()`,
     `getByTestId()`, `getByText()`. Never use CSS classes or XPath unless no
     accessible alternative exists after exhausting all options above.

2. **Describe block** — every test file MUST open with `test.describe()` using a
   meaningful name that reflects the module under test.

3. **AI-generated header** — first line of every generated file:
   ```
   /* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
   ```

4. **No hard-coded URLs** — always use `process.env.BASE_URL` or `baseURL` from
   `playwright.config.ts`. Never write `https://eventhub.rahulshettyacademy.com`
   directly in test files.

5. **AAA structure** — every test body must follow:
   ```
   // Arrange  (setup, navigate, prepare data)

   // Act      (perform user action)

   // Assert   (verify expected outcome)
   ```
   Include a blank line between each section.

6. **Import source** — always `import { test, expect } from '@playwright/test'`.
   Never import from `'playwright'` directly.

7. **Test naming convention**:
   ```
   'should [action] when [condition]'
   ```
   Examples:
   - `'should display error when invalid credentials are entered'`
   - `'should add event to cart when Book Now is clicked'`
   - `'should show booking confirmation when checkout completes successfully'`

8. **DB / state teardown** — tests that create data (new user, new event, booking)
   MUST clean up via `test.afterEach` or use `db.fixture.ts` with ROLLBACK.
   Never leave test data in the application after the suite runs.

9. **Auth state reuse** — use `storageState` (`auth.setup.ts`) for tests that
   require a logged-in user. Do NOT repeat login steps inside every test.

10. **Flake prevention** — never use `page.waitForTimeout()`. Use
    `page.waitForURL()`, `expect(locator).toBeVisible()`, or
    `expect(locator).toHaveText()` instead.

---

## Selector Priority Order (Follow Strictly)

| Priority | Method                  | When to use                                      |
|----------|-------------------------|--------------------------------------------------|
| 1        | `getByRole()`           | Buttons, links, headings, inputs with ARIA roles |
| 2        | `getByLabel()`          | Form fields tied to a `<label>` element          |
| 3        | `getByPlaceholder()`    | Inputs that have placeholder text only           |
| 4        | `getByTestId()`         | Elements with `data-testid` attribute            |
| 5        | `getByText()`           | Static visible text content (non-interactive)    |
| 6        | `locator('css=...')`    | Last resort — document the reason in a comment   |

---

## EventHub-Specific Selectors & Locators

```typescript
// ── Login Page ──────────────────────────────────────────────────
const emailInput    = page.getByPlaceholder('Email');
const passwordInput = page.getByPlaceholder('Password');
const loginButton   = page.getByRole('button', { name: 'Login' });
const loginError    = page.getByText('Incorrect email or password');

// ── Register Page ────────────────────────────────────────────────
const firstNameInput = page.getByPlaceholder('First Name');
const lastNameInput  = page.getByPlaceholder('Last Name');
const regEmailInput  = page.getByPlaceholder('Email');
const regPassInput   = page.getByPlaceholder('Password');
const registerBtn    = page.getByRole('button', { name: 'Register' });

// ── Dashboard / Events Listing ───────────────────────────────────
const searchBox      = page.getByPlaceholder('Search events');
const eventCards     = page.locator('.event-card');           // last resort
const firstEventCard = page.locator('.event-card').first();
const bookNowButton  = page.getByRole('button', { name: 'Book Now' });

// ── Cart ─────────────────────────────────────────────────────────
const cartIcon       = page.getByRole('link', { name: /cart/i });
const cartItems      = page.locator('.cart-item');
const removeButton   = page.getByRole('button', { name: 'Remove' });
const checkoutBtn    = page.getByRole('button', { name: 'Checkout' });

// ── Checkout ─────────────────────────────────────────────────────
const cardNumber     = page.getByPlaceholder('Card Number');
const expiryDate     = page.getByPlaceholder('MM/YY');
const cvv            = page.getByPlaceholder('CVV');
const confirmOrder   = page.getByRole('button', { name: 'Confirm Order' });
const successMsg     = page.getByText('Booking Confirmed');

// ── My Bookings ──────────────────────────────────────────────────
const bookingRows    = page.locator('.booking-row');
const cancelBooking  = page.getByRole('button', { name: 'Cancel' });

// ── Admin — Add Event ────────────────────────────────────────────
const eventNameInput  = page.getByPlaceholder('Event Name');
const eventDateInput  = page.getByPlaceholder('Event Date');
const eventPrice      = page.getByPlaceholder('Price');
const eventSeats      = page.getByPlaceholder('Available Seats');
const addEventBtn     = page.getByRole('button', { name: 'Add Event' });
```

---

## Auth Setup (storageState pattern)

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto(`${process.env.BASE_URL}/login`);
  await page.getByPlaceholder('Email').fill(process.env.USER_EMAIL!);
  await page.getByPlaceholder('Password').fill(process.env.USER_PASSWORD!);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts (relevant sections)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'https://eventhub.rahulshettyacademy.com',
    storageState: '.auth/user.json',
  },
  projects: [
    { name: 'setup',  testMatch: '**/auth.setup.ts' },
    {
      name: 'eventhub',
      dependencies: ['setup'],
    },
  ],
});
```

---

## Output Format

Return ONLY the TypeScript file content.
No explanations, no markdown fences, no preamble — just the `.spec.ts` file.

---

## Worked Examples

### Example 1 — Login (positive + negative)

INPUT: `'Test login with valid credentials and with invalid credentials'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect } from '@playwright/test';

test.describe('Login — Authentication', () => {

  test('should navigate to dashboard when valid credentials are entered', async ({ page }) => {
    // Arrange
    await page.goto('/login');

    // Act
    await page.getByPlaceholder('Email').fill(process.env.USER_EMAIL!);
    await page.getByPlaceholder('Password').fill(process.env.USER_PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();

    // Assert
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
  });

  test('should display error when invalid credentials are entered', async ({ page }) => {
    // Arrange
    await page.goto('/login');

    // Act
    await page.getByPlaceholder('Email').fill('invalid@test.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Assert
    await expect(page.getByText('Incorrect email or password')).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

});
```

---

### Example 2 — Book an Event End-to-End

INPUT: `'Test that a logged-in user can book an event and see it in My Bookings'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect } from '@playwright/test';

test.describe('Event Booking — End to End', () => {

  test('should appear in My Bookings when user completes checkout', async ({ page }) => {
    // Arrange
    await page.goto('/dashboard');
    const firstEvent = page.locator('.event-card').first();
    const eventName  = await firstEvent.getByRole('heading').textContent();

    // Act
    await firstEvent.getByRole('button', { name: 'Book Now' }).click();
    await page.getByRole('link', { name: /cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByPlaceholder('Card Number').fill('4111111111111111');
    await page.getByPlaceholder('MM/YY').fill('12/26');
    await page.getByPlaceholder('CVV').fill('123');
    await page.getByRole('button', { name: 'Confirm Order' }).click();

    // Assert
    await expect(page.getByText('Booking Confirmed')).toBeVisible();
    await page.goto('/mybookings');
    await expect(page.getByText(eventName!)).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cancel the booking created during the test to restore state
    await page.goto('/mybookings');
    const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.getByRole('button', { name: 'Yes, Cancel' }).click();
    }
  });

});
```

---

### Example 3 — Admin Creates and Deletes an Event

INPUT: `'Test admin can create a new event and then delete it'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect } from '@playwright/test';

const TEST_EVENT = {
  name:  'Playwright Automation Summit',
  date:  '2025-12-15',
  price: '499',
  seats: '50',
};

test.describe('Admin — Event Management', () => {

  test('should remove event from listing when admin deletes it', async ({ page }) => {
    // Arrange
    await page.goto('/addevent');
    await page.getByPlaceholder('Event Name').fill(TEST_EVENT.name);
    await page.getByPlaceholder('Event Date').fill(TEST_EVENT.date);
    await page.getByPlaceholder('Price').fill(TEST_EVENT.price);
    await page.getByPlaceholder('Available Seats').fill(TEST_EVENT.seats);
    await page.getByRole('button', { name: 'Add Event' }).click();
    await expect(page.getByText('Event created successfully')).toBeVisible();

    // Act
    await page.goto('/eventmanagement');
    const eventRow = page.getByRole('row', { name: TEST_EVENT.name });
    await eventRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Assert
    await expect(page.getByText(TEST_EVENT.name)).not.toBeVisible();
  });

});
```

---

## Test Coverage Checklist for EventHub

Use this to ensure full coverage across the application:

### Authentication
- [ ] Register new user (valid data)
- [ ] Register with duplicate email (error)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error message)
- [ ] Redirect to login when accessing protected route unauthenticated
- [ ] Logout clears session

### Events Listing (Dashboard)
- [ ] All event cards load on dashboard
- [ ] Search filters events by name
- [ ] Events display name, date, price, available seats
- [ ] "Book Now" button is visible on each card

### Booking Flow
- [ ] Clicking "Book Now" adds event to cart
- [ ] Cart icon shows correct count after booking
- [ ] Cart lists booked events with correct details
- [ ] Remove from cart decreases count
- [ ] Checkout form validates required fields
- [ ] Successful checkout shows confirmation message

### My Bookings
- [ ] Booked events appear in "My Bookings"
- [ ] Cancel booking removes it from the list
- [ ] Cancelled event confirmation prompt appears

### Admin
- [ ] Admin can create a new event
- [ ] New event appears on dashboard
- [ ] Admin can edit an existing event
- [ ] Admin can delete an event
- [ ] Deleted event no longer appears on dashboard

---

## .gitignore — Required Entries

```bash
# .gitignore
.auth/
.env
node_modules/
test-results/
playwright-report/
```

---

## Environment Variables Required

```bash
# .env (never commit to Git)
BASE_URL=https://eventhub.rahulshettyacademy.com
USER_EMAIL=pavan.chaudhari@jeavio.com
USER_PASSWORD=Nikecr@777
ADMIN_EMAIL=pavan.chaudhari@jeavio.com
ADMIN_PASSWORD=Nikecr@777
```

