import { test, expect } from '../fixtures/auth_fixtures';
import { z } from 'zod';

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'JoshJ@yopmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Yopmail@1234';

// ✅ Make sure BOTH schemas are here
const RegisterRequestSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const RegisterResponseSchema = z.object({
  success: z.boolean(),
  token:   z.string(),
  user: z.object({
    id:    z.number(),
    email: z.string().email(),
  }),
});

const LoginRequestSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  token:   z.string(),
  user: z.object({
    id:    z.number(),
    email: z.string().email(),
  }),
});

test('POST /api/auth/register - user registration', { tag: ['@api', '@auth'] }, async ({ request }) => {
  const requestBody = {
    email:    `test.${Date.now()}@yopmail.com`,
    password: TEST_PASSWORD,
  };

  expect(() => RegisterRequestSchema.parse(requestBody)).not.toThrow();

  const response = await request.post('/api/auth/register', {
    data: requestBody,
  });

  expect(response.status()).toBe(201);

  const body = await response.json();

  expect(() => RegisterResponseSchema.parse(body)).not.toThrow();
  expect(body.user.id).toBeDefined();
  expect(body.token).toBeDefined();
});

test('POST /api/auth/login - user login', { tag: ['@api', '@auth'] }, async ({ request }) => {
  const requestBody = {
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  };

  expect(() => LoginRequestSchema.parse(requestBody)).not.toThrow();

  const response = await request.post('/api/auth/login', {
    data: requestBody,
  });

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(() => LoginResponseSchema.parse(body)).not.toThrow();
  expect(body.success).toBe(true);
  expect(body.token).toBeDefined();
  expect(body.user.email).toBe(requestBody.email);
});


test('GET bookings - with auth token', { tag: ['@api', '@bookings'] }, async ({ request, apiToken }) => {

  // Use token to call bookings API
  const response = await request.get('/api/bookings', {
    params: {
      eventId: '3',
      status:  'confirmed',
      page:    '1',
      limit:   '10',
    },
    headers: {
      Authorization: `Bearer ${apiToken}`,
    }
  });

  console.log('Bookings Status:', response.status());
  console.log('Bookings Body:',   await response.json());

  expect(response.status()).toBe(200);
});



test('DELETE /api/bookings/:id - cancel booking with auth token', { tag: ['@api', '@bookings'] }, async ({ request, adminApiToken }) => {

  // Fetch existing bookings to obtain a real booking ID
  const listRes = await request.get('/api/bookings', {
    headers: { Authorization: `Bearer ${adminApiToken}` },
  });
  expect(listRes.status()).toBe(200);
  const listBody = await listRes.json();

  const items: any[] = listBody.bookings ?? listBody.data ?? (Array.isArray(listBody) ? listBody : []);
  if (items.length === 0) {
    test.skip(true, 'No bookings available — create one before running this test');
    return;
  }
  const bookingId = items[0].id;

  const response = await request.delete(`/api/bookings/${bookingId}`, {
    headers: { Authorization: `Bearer ${adminApiToken}` },
  });

  console.log('Delete Status:', response.status());
  const body = await response.json();
  console.log('Delete Body:', body);

  expect(response.status()).toBe(200);
  expect(body.success).toBe(true);
  expect(body.message).toBe('Booking cancelled');
});

