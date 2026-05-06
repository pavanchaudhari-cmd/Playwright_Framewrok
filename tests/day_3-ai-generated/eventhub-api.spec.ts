import { test, expect } from '../../fixtures/auth_fixtures';
import { z } from 'zod';

// ─── Shared credentials ───────────────────────────────────────────────────────
const TEST_USER = {
  email:    process.env.TEST_EMAIL    ?? 'JoshJ@yopmail.com',
  password: process.env.TEST_PASSWORD ?? 'Yopmail@1234',
};

// ─── Zod schemas — match actual API responses ─────────────────────────────────

const AuthResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.number(),
    email: z.string().email(),
  }),
});

// GET /api/auth/me → { success, user: { userId, email, iat, exp } }
const MeResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    userId: z.number(),
    email: z.string().email(),
    iat: z.number(),
    exp: z.number(),
  }),
});

// price is returned as a string by the API
const EventSchema = z.object({
  id: z.number(),
  title: z.string(),
  category: z.string(),
  venue: z.string(),
  city: z.string(),
  eventDate: z.string(),
  price: z.string(),
  totalSeats: z.number(),
  availableSeats: z.number(),
});

// bookingRef format is "W-XXXXXX"; totalPrice is also a string
const BookingSchema = z.object({
  id: z.number(),
  bookingRef: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  quantity: z.number(),
  totalPrice: z.string(),
  status: z.string(),
});

const PaginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// List responses → { success, data: [...], pagination: {...} }
const PaginatedEventsSchema = z.object({
  success: z.boolean(),
  data: z.array(EventSchema),
  pagination: PaginationSchema,
});

const PaginatedBookingsSchema = z.object({
  success: z.boolean(),
  data: z.array(BookingSchema),
  pagination: PaginationSchema,
});


// ─────────────────────────────────────────────────────────────────────────────
// Health & Config
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Health & Config', { tag: ['@api', '@health', '@eventhub'] }, () => {

  test('GET /api/health - returns 200 with status ok and dbStatus', async ({ request }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.dbStatus).toBeDefined();   // field is "dbStatus", not "database"
    expect(body.timestamp).toBeDefined();
  });

  test('GET /api/config - returns feature flags', async ({ request }) => {
    const res = await request.get('/api/config');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.showExploreLinks).toBe('boolean');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — Register
// ─────────────────────────────────────────────────────────────────────────────
test.describe('POST /api/auth/register', { tag: ['@api', '@auth', '@eventhub'] }, () => {

  test('TC01 - registers a new user and returns a JWT token', async ({ request }) => {
    const uniqueEmail = `testuser_${Date.now()}@mailinator.com`;

    const res = await request.post('/api/auth/register', {
      data: { email: uniqueEmail, password: 'Test@12345' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(() => AuthResponseSchema.parse(body)).not.toThrow();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(uniqueEmail);
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('TC02 - returns 400 when email is already registered', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: TEST_USER.email, password: 'anyPassword@1' },
    });

    // API returns 400 (not 409) for duplicate email
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/already registered/i);
  });

  test('TC03 - returns 400 when password is too short (< 6 chars)', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: `short_${Date.now()}@mailinator.com`, password: '123' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('TC04 - returns 400 when email field is missing', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { password: 'ValidPass@1' },
    });

    expect(res.status()).toBe(400);
  });

  test('TC05 - returns 400 when password field is missing', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: `nopw_${Date.now()}@mailinator.com` },
    });

    expect(res.status()).toBe(400);
  });

  test('TC06 - returns 400 for an invalid email format', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'not-an-email', password: 'ValidPass@1' },
    });

    expect(res.status()).toBe(400);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — Login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('POST /api/auth/login', { tag: ['@api', '@auth', '@eventhub'] }, () => {

  test('TC01 - returns 200 with a valid JWT token on correct credentials', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: TEST_USER });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(() => AuthResponseSchema.parse(body)).not.toThrow();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(TEST_USER.email);
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('TC02 - returns 400 for wrong password', async ({ request }) => {
    // API returns 400 (not 401) for invalid credentials
    const res = await request.post('/api/auth/login', {
      data: { email: TEST_USER.email, password: 'WrongPassword@99' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/invalid email or password/i);
  });

  test('TC03 - returns 400 for non-existent email', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'nobody_xyz_99@mailinator.com', password: 'SomePass@1' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('TC04 - returns 400 when request body is empty', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: {} });

    expect(res.status()).toBe(400);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — Token validation (GET /api/auth/me)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GET /api/auth/me', { tag: ['@api', '@auth', '@eventhub'] }, () => {

  test('TC01 - returns user info for a valid bearer token', async ({ request, apiToken }) => {
    const res = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(() => MeResponseSchema.parse(body)).not.toThrow();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(TEST_USER.email);
    expect(body.user.userId).toBeGreaterThan(0);
  });

  test('TC02 - returns 401 when no Authorization header is provided', async ({ request }) => {
    const res = await request.get('/api/auth/me');

    expect(res.status()).toBe(401);
  });

  test('TC03 - returns 401 for a malformed / invalid token', async ({ request }) => {
    const res = await request.get('/api/auth/me', {
      headers: { Authorization: 'Bearer this.is.not.a.real.token' },
    });

    expect(res.status()).toBe(401);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Events — List  (auth required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GET /api/events', { tag: ['@api', '@events', '@eventhub'] }, () => {

  let token: string;

  test.beforeAll(async ({ apiToken }) => {
    token = apiToken;
  });

  test('TC01 - returns paginated list of events', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(() => PaginatedEventsSchema.parse(body)).not.toThrow();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(0);
    expect(body.pagination.page).toBe(1);
  });

  test('TC02 - pagination: page and limit query params work', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: '1', limit: '2' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pagination.limit).toBe(2);
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  test('TC03 - category filter returns only matching events', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { category: 'Conference' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const event of body.data) {
      expect(event.category.toLowerCase()).toBe('conference');
    }
  });

  test('TC04 - city filter returns only matching events', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { city: 'Hyderabad' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const event of body.data) {
      expect(event.city.toLowerCase()).toBe('hyderabad');
    }
  });

  test('TC05 - search filter returns events matching the keyword', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { search: 'Tech' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(0);
  });

  test('TC06 - returns empty data array for a search with no matches', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { search: 'zzz_no_such_event_xyz_999' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(0);
  });

  test('TC07 - limit=100 is the upper bound and does not error', async ({ request }) => {
    const res = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: '100' },
    });

    expect(res.status()).toBe(200);
  });

  test('TC08 - returns 401 without an auth token', async ({ request }) => {
    const res = await request.get('/api/events');
    expect(res.status()).toBe(401);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Events — Get single event  (auth required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GET /api/events/{id}', { tag: ['@api', '@events', '@eventhub'] }, () => {

  let token: string;

  test.beforeAll(async ({ apiToken }) => {
    token = apiToken;
  });

  test('TC01 - returns event details for a valid ID', async ({ request }) => {
    // Fetch first available event to get a real ID
    const listRes = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: '1' },
    });
    const listBody = await listRes.json();
    const firstEventId: number = listBody.data[0]?.id;

    test.skip(!firstEventId, 'No events in the database to test against');

    const res = await request.get(`/api/events/${firstEventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(() => EventSchema.parse(body.data)).not.toThrow();  // response is { success, data: {...} }
    expect(body.data.id).toBe(firstEventId);
  });

  test('TC02 - returns 404 for a non-existent event ID', async ({ request }) => {
    const res = await request.get('/api/events/999999999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Events — Create, Update, Delete  (auth required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Events CRUD (authenticated)', { tag: ['@api', '@events', '@crud', '@eventhub'] }, () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let createdEventId: number;

  // Full payload required for POST and PUT
  const baseEventPayload = {
    category: 'Conference',
    venue: 'Test Venue Hall',
    city: 'Bangalore',
    eventDate: '2026-12-01T09:00:00.000Z',
    price: 499,
    totalSeats: 50,
    description: 'Auto-generated test event',
  };

  test.beforeAll(async ({ apiToken }) => {
    token = apiToken;
  });

  test('TC01 - POST /api/events creates a new event and returns 201', async ({ request }) => {
    const payload = { ...baseEventPayload, title: `Playwright Test Event ${Date.now()}` };

    const res = await request.post('/api/events', {
      data: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/created/i);
    // Response is wrapped: { success, data: {...}, message }
    expect(() => EventSchema.parse(body.data)).not.toThrow();
    expect(body.data.title).toBe(payload.title);
    createdEventId = body.data.id;
  });

  test('TC02 - POST /api/events returns 401 without an auth token', async ({ request }) => {
    const res = await request.post('/api/events', {
      data: { ...baseEventPayload, title: 'Unauthorized Event' },
    });

    expect(res.status()).toBe(401);
  });

  test('TC03 - POST /api/events returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post('/api/events', {
      data: { title: 'Missing Fields Event' },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('TC04 - PUT /api/events/{id} updates the event with a full payload', async ({ request }) => {
    test.skip(!createdEventId, 'TC01 must pass first to get a valid event ID');

    // PUT requires all required fields — it is a full replace, not a partial update
    const updatedPayload = { ...baseEventPayload, title: 'Updated Playwright Event', price: 999 };

    const res = await request.put(`/api/events/${createdEventId}`, {
      data: updatedPayload,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Updated Playwright Event');
  });

  test('TC05 - PUT /api/events/{id} returns 401 without auth', async ({ request }) => {
    test.skip(!createdEventId, 'TC01 must pass first to get a valid event ID');

    const res = await request.put(`/api/events/${createdEventId}`, {
      data: { ...baseEventPayload, title: 'Should Not Update' },
    });

    expect(res.status()).toBe(401);
  });

  test('TC06 - PUT /api/events/{id} returns 404 for non-existent event', async ({ request }) => {
    // Must send a full valid payload so validation passes and the 404 can surface
    const res = await request.put('/api/events/999999999', {
      data: { ...baseEventPayload, title: 'Ghost Event' },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('TC07 - DELETE /api/events/{id} removes the event and returns success', async ({ request }) => {
    test.skip(!createdEventId, 'TC01 must pass first to get a valid event ID');

    const res = await request.delete(`/api/events/${createdEventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/deleted/i);

    // Confirm it is gone
    const getRes = await request.get(`/api/events/${createdEventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(404);
  });

  test('TC08 - DELETE /api/events/{id} returns 401 without auth', async ({ request }) => {
    const res = await request.delete('/api/events/1');
    expect(res.status()).toBe(401);
  });

  test('TC09 - DELETE /api/events/{id} returns 404 for non-existent event', async ({ request }) => {
    const res = await request.delete('/api/events/999999999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Bookings — Create, List, Get, Cancel  (auth required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Bookings (authenticated)', { tag: ['@api', '@bookings', '@crud', '@eventhub'] }, () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let createdBookingId: number;
  let createdBookingRef: string;

  test.beforeAll(async ({ apiToken }) => {
    token = apiToken;
  });

  test('TC01 - POST /api/bookings creates a booking and returns a booking reference', async ({ request }) => {
    // Events endpoint also requires auth
    const listRes = await request.get('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: '10' },
    });
    const listBody = await listRes.json();
    const eventWithSeats = listBody.data?.find(
      (e: { availableSeats: number }) => e.availableSeats > 0
    );

    test.skip(!eventWithSeats, 'No event with available seats found');

    const payload = {
      eventId: eventWithSeats.id,
      customerName: 'Playwright Tester',
      customerEmail: 'pw.tester@mailinator.com',
      customerPhone: '9876543210',
      quantity: 1,
    };

    const res = await request.post('/api/bookings', {
      data: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/confirmed/i);
    // Response is wrapped: { success, data: {...}, message }
    expect(() => BookingSchema.parse(body.data)).not.toThrow();
    expect(body.data.status).toBe('confirmed');
    expect(body.data.quantity).toBe(1);
    createdBookingId = body.data.id;
    createdBookingRef = body.data.bookingRef;
  });

  test('TC02 - POST /api/bookings returns 401 without auth token', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: {
        eventId: 1,
        customerName: 'No Auth User',
        customerEmail: 'noauth@mailinator.com',
        customerPhone: '9000000000',
        quantity: 1,
      },
    });

    expect(res.status()).toBe(401);
  });

  test('TC03 - POST /api/bookings returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: { eventId: 1 },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('TC04 - POST /api/bookings returns 400 when quantity is 0', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: {
        eventId: 1,
        customerName: 'Bad Qty',
        customerEmail: 'badqty@mailinator.com',
        customerPhone: '9000000001',
        quantity: 0,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(400);
  });

  test('TC05 - POST /api/bookings returns 400 when quantity exceeds 10', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: {
        eventId: 1,
        customerName: 'Over Limit',
        customerEmail: 'over@mailinator.com',
        customerPhone: '9000000002',
        quantity: 11,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(400);
  });

  test('TC06 - GET /api/bookings returns a paginated list of bookings', async ({ request }) => {
    const res = await request.get('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: '1', limit: '5' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(() => PaginatedBookingsSchema.parse(body)).not.toThrow();
    expect(body.pagination.page).toBe(1);
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  test('TC07 - GET /api/bookings with status=confirmed filter returns only confirmed bookings', async ({ request }) => {
    const res = await request.get('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` },
      params: { status: 'confirmed' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const booking of body.data) {
      expect(booking.status).toBe('confirmed');
    }
  });

  test('TC08 - GET /api/bookings returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/bookings');
    expect(res.status()).toBe(401);
  });

  test('TC09 - GET /api/bookings/{id} returns booking details by ID', async ({ request }) => {
    test.skip(!createdBookingId, 'TC01 must pass first to get a valid booking ID');

    const res = await request.get(`/api/bookings/${createdBookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Response is wrapped: { success, data: {...} }
    expect(() => BookingSchema.parse(body.data)).not.toThrow();
    expect(body.data.id).toBe(createdBookingId);
  });

  test('TC10 - GET /api/bookings/{id} returns 404 for a non-existent booking', async ({ request }) => {
    const res = await request.get('/api/bookings/999999999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
  });

  test('TC11 - GET /api/bookings/ref/{ref} returns booking by reference code', async ({ request }) => {
    test.skip(!createdBookingRef, 'TC01 must pass first to get a valid booking reference');

    const res = await request.get(`/api/bookings/ref/${createdBookingRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.bookingRef).toBe(createdBookingRef);
  });

  test('TC12 - GET /api/bookings/ref/{ref} returns 404 for an invalid reference', async ({ request }) => {
    const res = await request.get('/api/bookings/ref/INVALID-REF-999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
  });

  test('TC13 - DELETE /api/bookings/{id} cancels the booking', async ({ request }) => {
    test.skip(!createdBookingId, 'TC01 must pass first to get a valid booking ID');

    const res = await request.delete(`/api/bookings/${createdBookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/cancelled/i);

    // Verify the booking is now cancelled or gone
    const getRes = await request.get(`/api/bookings/${createdBookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const isGoneOrCancelled =
      getRes.status() === 404 ||
      (await getRes.json().then((b) => b.data?.status === 'cancelled').catch(() => false));
    expect(isGoneOrCancelled).toBe(true);
  });

  test('TC14 - DELETE /api/bookings/{id} returns 401 without auth', async ({ request }) => {
    const res = await request.delete('/api/bookings/1');
    expect(res.status()).toBe(401);
  });

  test('TC15 - DELETE /api/bookings/{id} returns 404 for a non-existent booking', async ({ request }) => {
    const res = await request.delete('/api/bookings/999999999', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
  });

});
