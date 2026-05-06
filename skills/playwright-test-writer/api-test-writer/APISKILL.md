# skills/api-test-writer/SKILL.md

## What this skill does
Generates production-ready Playwright TypeScript API test files specifically for
https://eventhub.rahulshettyacademy.com — covering all REST API endpoints:
authentication, user management, events CRUD, booking, and cart operations.
Read this file in full before writing any API test code.

---

## Application API Overview — EventHub

### Base URL
```
https://eventhub.rahulshettyacademy.com/api
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```
Token is obtained from the `/api/auth/login` response.

---

## API Endpoints Reference

### Auth Endpoints
| Method | Endpoint             | Description              | Auth Required |
|--------|----------------------|--------------------------|---------------|
| POST   | `/api/auth/register` | Register a new user      | No            |
| POST   | `/api/auth/login`    | Login and get token      | No            |

### Events Endpoints
| Method | Endpoint              | Description              | Auth Required |
|--------|-----------------------|--------------------------|---------------|
| GET    | `/api/events`         | Get all events           | No            |
| GET    | `/api/events/:id`     | Get single event by ID   | No            |
| POST   | `/api/events`         | Create new event         | Yes (Admin)   |
| PUT    | `/api/events/:id`     | Update an event          | Yes (Admin)   |
| DELETE | `/api/events/:id`     | Delete an event          | Yes (Admin)   |

### Booking Endpoints
| Method | Endpoint              | Description              | Auth Required |
|--------|-----------------------|--------------------------|---------------|
| POST   | `/api/bookings`       | Create a booking         | Yes           |
| GET    | `/api/bookings`       | Get user's bookings      | Yes           |
| DELETE | `/api/bookings/:id`   | Cancel a booking         | Yes           |

### Cart Endpoints
| Method | Endpoint              | Description              | Auth Required |
|--------|-----------------------|--------------------------|---------------|
| POST   | `/api/cart`           | Add event to cart        | Yes           |
| GET    | `/api/cart`           | Get cart items           | Yes           |
| DELETE | `/api/cart/:id`       | Remove item from cart    | Yes           |

---

## Non-Negotiable Rules

1. **Always use Playwright `request` fixture** for API tests — never use `axios`,
   `fetch`, or `node-http` directly inside test files.

2. **Describe block** — every test file MUST open with `test.describe()` using a
   meaningful name that reflects the API module under test.

3. **AI-generated header** — first line of every generated file:
   ```
   /* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
   ```

4. **No hard-coded URLs** — always use `process.env.BASE_URL` or `baseURL` from
   `playwright.config.ts`. Never write the full domain in test files.

5. **AAA structure** — every test body must follow:
   ```
   // Arrange  (prepare payload, headers, token)

   // Act      (make the API call)

   // Assert   (verify status code + response body)
   ```
   Include a blank line between each section.

6. **Import source** — always `import { test, expect } from '@playwright/test'`.
   Never import from `'playwright'` directly.

7. **Test naming convention**:
   ```
   'should [expected result] when [condition]'
   ```
   Examples:
   - `'should return 200 and token when valid credentials are provided'`
   - `'should return 401 when request is made without auth token'`
   - `'should return 404 when event ID does not exist'`

8. **Always assert BOTH** status code AND response body shape — never assert
   only one of them.

9. **Token reuse** — obtain auth token in `test.beforeAll()` and reuse across
   all tests in the file. Never call login inside every individual test.

10. **Cleanup after write operations** — any test that creates data (event,
    booking, cart item) MUST delete it in `test.afterAll()` or `test.afterEach()`.
    Never leave test data behind.

11. **Schema validation** — always validate the response body structure, not just
    values. Check that required fields exist and have the correct type.

12. **Test all status codes** — for every endpoint, test:
    - ✅ Happy path (2xx)
    - ❌ Unauthorized (401)
    - ❌ Not found (404)
    - ❌ Bad request (400) for invalid payloads

---

## Response Assertion Patterns

```typescript
// ── Status Code ──────────────────────────────────────────────────
expect(response.status()).toBe(200);
expect(response.ok()).toBeTruthy();   // any 2xx

// ── Response Body ─────────────────────────────────────────────────
const body = await response.json();
expect(body).toHaveProperty('token');
expect(body).toHaveProperty('message', 'Login successful');
expect(body.data).toBeDefined();

// ── Array Response ────────────────────────────────────────────────
expect(Array.isArray(body)).toBeTruthy();
expect(body.length).toBeGreaterThan(0);

// ── Schema Shape Validation ───────────────────────────────────────
expect(body).toMatchObject({
  id:    expect.any(String),
  name:  expect.any(String),
  price: expect.any(Number),
  seats: expect.any(Number),
});

// ── Negative Assertion ────────────────────────────────────────────
expect(response.status()).toBe(401);
const error = await response.json();
expect(error).toHaveProperty('message');
```

---

## Request Payload Templates

```typescript
// ── Register Payload ──────────────────────────────────────────────
const registerPayload = {
  firstName: 'Pavan',
  lastName:  'Chaudhari',
  email:     'pavan.test@jeavio.com',
  password:  'Nikecr@777',
};

// ── Login Payload ─────────────────────────────────────────────────
const loginPayload = {
  email:    process.env.USER_EMAIL!,
  password: process.env.USER_PASSWORD!,
};

// ── Create Event Payload ──────────────────────────────────────────
const eventPayload = {
  name:        'Playwright API Summit',
  date:        '2025-12-15',
  price:       499,
  seats:       50,
  description: 'Annual automation testing conference',
  location:    'Pune, India',
};

// ── Create Booking Payload ────────────────────────────────────────
const bookingPayload = {
  eventId:  '<event-id-from-response>',
  quantity: 1,
};

// ── Add to Cart Payload ───────────────────────────────────────────
const cartPayload = {
  eventId:  '<event-id-from-response>',
  quantity: 1,
};
```

---

## Auth Token Setup Pattern

```typescript
// Always use beforeAll to get token once and reuse
test.describe('Events API', () => {
  let token: string;
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });

    const response = await request.post('/api/auth/login', {
      data: {
        email:    process.env.USER_EMAIL!,
        password: process.env.USER_PASSWORD!,
      },
    });

    const body = await response.json();
    token = body.token;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // All tests in this describe use `token` for Authorization header
});
```

---

## Output Format

Return ONLY the TypeScript file content.
No explanations, no markdown fences, no preamble — just the `.spec.ts` file.

---

## Worked Examples

### Example 1 — Auth API (Register + Login)

INPUT: `'Test register and login API endpoints'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect } from '@playwright/test';

test.describe('Auth API — Register & Login', () => {

  test('should return token when valid login credentials are provided', async ({ request }) => {
    // Arrange
    const payload = {
      email:    process.env.USER_EMAIL!,
      password: process.env.USER_PASSWORD!,
    };

    // Act
    const response = await request.post('/api/auth/login', { data: payload });

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('should return 401 when invalid credentials are provided', async ({ request }) => {
    // Arrange
    const payload = {
      email:    'wrong@email.com',
      password: 'wrongpassword',
    };

    // Act
    const response = await request.post('/api/auth/login', { data: payload });

    // Assert
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('should return 400 when required fields are missing in register', async ({ request }) => {
    // Arrange
    const incompletePayload = { email: 'pavan.test@jeavio.com' }; // missing password

    // Act
    const response = await request.post('/api/auth/register', { data: incompletePayload });

    // Assert
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

});
```

---

### Example 2 — Events API (CRUD)

INPUT: `'Test create, get, update and delete event API endpoints'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Events API — CRUD Operations', () => {
  let apiContext: APIRequestContext;
  let token:      string;
  let createdEventId: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });

    const loginRes = await apiContext.post('/api/auth/login', {
      data: {
        email:    process.env.USER_EMAIL!,
        password: process.env.USER_PASSWORD!,
      },
    });
    const loginBody = await loginRes.json();
    token = loginBody.token;
  });

  test.afterAll(async () => {
    // Cleanup: delete event created during tests
    if (createdEventId) {
      await apiContext.delete(`/api/events/${createdEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await apiContext.dispose();
  });

  test('should return list of events when GET /api/events is called', async () => {
    // Arrange — no auth needed for listing

    // Act
    const response = await apiContext.get('/api/events');

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      name:  expect.any(String),
      price: expect.any(Number),
    });
  });

  test('should create event when valid payload and admin token are provided', async () => {
    // Arrange
    const payload = {
      name:        'Playwright API Summit',
      date:        '2025-12-15',
      price:       499,
      seats:       50,
      description: 'Annual automation testing conference',
    };

    // Act
    const response = await apiContext.post('/api/events', {
      data:    payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(payload.name);
    createdEventId = body.id; // save for cleanup
  });

  test('should return 401 when creating event without auth token', async () => {
    // Arrange
    const payload = { name: 'Unauthorized Event', price: 100, seats: 10 };

    // Act
    const response = await apiContext.post('/api/events', { data: payload });

    // Assert
    expect(response.status()).toBe(401);
  });

  test('should return 404 when getting event with non-existent ID', async () => {
    // Arrange
    const fakeId = '000000000000000000000000';

    // Act
    const response = await apiContext.get(`/api/events/${fakeId}`);

    // Assert
    expect(response.status()).toBe(404);
  });

});
```

---

### Example 3 — Booking API

INPUT: `'Test create booking and cancel booking API'`

OUTPUT:
```typescript
/* AI-GENERATED — Review required | Engineer: Pavan | Date: 2025-05-04 */
import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Booking API — Create & Cancel', () => {
  let apiContext:    APIRequestContext;
  let token:         string;
  let eventId:       string;
  let bookingId:     string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });

    // Get auth token
    const loginRes = await apiContext.post('/api/auth/login', {
      data: {
        email:    process.env.USER_EMAIL!,
        password: process.env.USER_PASSWORD!,
      },
    });
    const loginBody = await loginRes.json();
    token = loginBody.token;

    // Get first available event ID
    const eventsRes = await apiContext.get('/api/events');
    const events    = await eventsRes.json();
    eventId = events[0].id;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('should create booking when valid eventId and token are provided', async () => {
    // Arrange
    const payload = { eventId, quantity: 1 };

    // Act
    const response = await apiContext.post('/api/bookings', {
      data:    payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.eventId).toBe(eventId);
    bookingId = body.id;
  });

  test('should return bookings list when GET /api/bookings is called', async () => {
    // Arrange — token already available

    // Act
    const response = await apiContext.get('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('should cancel booking when valid bookingId and token are provided', async () => {
    // Arrange — bookingId from create test

    // Act
    const response = await apiContext.delete(`/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('should return 401 when booking is created without auth token', async () => {
    // Arrange
    const payload = { eventId, quantity: 1 };

    // Act
    const response = await apiContext.post('/api/bookings', { data: payload });

    // Assert
    expect(response.status()).toBe(401);
  });

});
```

---

## API Test Coverage Checklist

### Auth
- [ ] POST `/api/auth/login` — valid credentials → 200 + token
- [ ] POST `/api/auth/login` — invalid credentials → 401
- [ ] POST `/api/auth/login` — missing fields → 400
- [ ] POST `/api/auth/register` — new user → 201
- [ ] POST `/api/auth/register` — duplicate email → 409

### Events
- [ ] GET  `/api/events` — returns array → 200
- [ ] GET  `/api/events/:id` — valid ID → 200 + event object
- [ ] GET  `/api/events/:id` — invalid ID → 404
- [ ] POST `/api/events` — with admin token → 201 + created event
- [ ] POST `/api/events` — without token → 401
- [ ] POST `/api/events` — missing required fields → 400
- [ ] PUT  `/api/events/:id` — valid update → 200
- [ ] PUT  `/api/events/:id` — without token → 401
- [ ] DELETE `/api/events/:id` — with admin token → 200
- [ ] DELETE `/api/events/:id` — without token → 401

### Bookings
- [ ] POST `/api/bookings` — with token → 201 + booking object
- [ ] POST `/api/bookings` — without token → 401
- [ ] POST `/api/bookings` — invalid eventId → 400
- [ ] GET  `/api/bookings` — with token → 200 + array
- [ ] GET  `/api/bookings` — without token → 401
- [ ] DELETE `/api/bookings/:id` — with token → 200
- [ ] DELETE `/api/bookings/:id` — wrong user's booking → 403

### Cart
- [ ] POST `/api/cart` — add event → 201
- [ ] GET  `/api/cart` — get items → 200 + array
- [ ] DELETE `/api/cart/:id` — remove item → 200
- [ ] All above without token → 401

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

---

## Playwright Config for API Testing

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'https://eventhub.rahulshettyacademy.com',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
  },
  projects: [
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.spec.ts',
    },
    {
      name: 'ui-tests',
      testMatch: '**/ui/**/*.spec.ts',
    },
  ],
});
```

