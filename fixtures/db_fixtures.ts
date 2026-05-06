import dotenv from 'dotenv';
import { test as base, expect, type APIRequestContext } from '@playwright/test';

dotenv.config();

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY!;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY!;

export type SupabaseFixtures = {
  /** Supabase REST API base URL. */
  supabaseUrl: string;
  /** APIRequestContext pre-configured with the service key (bypasses RLS). */
  serviceRequest: APIRequestContext;
  /** APIRequestContext pre-configured with the anon/publishable key (respects RLS). */
  anonRequest: APIRequestContext;
  /** Parsed OpenAPI definitions block from /rest/v1/. */
  schemaDefinitions: Record<string, any>;
  /** Column properties for the alerts table. */
  alertsColumns: Record<string, Record<string, unknown>>;
};

export const test = base.extend<SupabaseFixtures>({
  supabaseUrl: async ({}, use) => {
    await use(SUPABASE_URL);
  },

  serviceRequest: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: SUPABASE_URL,
      extraHTTPHeaders: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  anonRequest: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: SUPABASE_URL,
      extraHTTPHeaders: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  schemaDefinitions: async ({ serviceRequest, supabaseUrl }, use) => {
    const res = await serviceRequest.get(`${supabaseUrl}/rest/v1/`);
    if (!res.ok()) throw new Error(`Failed to fetch schema: ${res.status()} ${await res.text()}`);
    const spec = await res.json();
    await use(spec.definitions as Record<string, any>);
  },

  alertsColumns: async ({ schemaDefinitions }, use) => {
    const cols = schemaDefinitions?.alerts?.properties;
    if (!cols) throw new Error('alerts table not found in schema definitions');
    await use(cols as Record<string, Record<string, unknown>>);
  },
});

export { expect };
