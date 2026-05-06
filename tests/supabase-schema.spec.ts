import { test, expect } from '../fixtures/db_fixtures';

const EXPECTED_COLUMNS: Record<string, { type: string; format: string; maxLength?: number }> = {
  id:          { type: 'string', format: 'character varying',        maxLength: 36 },
  eval_run_id: { type: 'string', format: 'character varying',        maxLength: 36 },
  message:     { type: 'string', format: 'text' },
  severity:    { type: 'string', format: 'character varying',        maxLength: 50 },
  created_at:  { type: 'string', format: 'timestamp with time zone' },
};

test.describe('Supabase — alerts table schema', { tag: ['@db', '@schema'] }, () => {

  // ── Connection ────────────────────────────────────────────────────────────────

  test('TC-DB01: Supabase REST API is reachable with service key', async ({ serviceRequest, supabaseUrl }) => {
    const res = await serviceRequest.get(`${supabaseUrl}/rest/v1/`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('definitions');
  });

  // ── Table existence ───────────────────────────────────────────────────────────

  test('TC-DB02: alerts table exists in the schema', async ({ schemaDefinitions }) => {
    expect(schemaDefinitions, 'alerts table must be in definitions').toHaveProperty('alerts');
  });

  test('TC-DB03: eval_runs table (FK target) exists in the schema', async ({ schemaDefinitions }) => {
    expect(schemaDefinitions, 'eval_runs must exist as FK target').toHaveProperty('eval_runs');
  });

  // ── Column presence ───────────────────────────────────────────────────────────

  test('TC-DB04: all expected columns are present', async ({ alertsColumns }) => {
    for (const col of Object.keys(EXPECTED_COLUMNS)) {
      expect(alertsColumns, `column "${col}" is missing`).toHaveProperty(col);
    }
  });

  test('TC-DB05: no unexpected extra columns', async ({ alertsColumns }) => {
    expect(Object.keys(alertsColumns).sort()).toEqual(Object.keys(EXPECTED_COLUMNS).sort());
  });

  // ── Column types & formats ────────────────────────────────────────────────────

  for (const [col, meta] of Object.entries(EXPECTED_COLUMNS)) {
    test(`TC-DB06-${col}: column "${col}" has type="${meta.type}" format="${meta.format}"`, async ({ alertsColumns }) => {
      expect(alertsColumns[col].type,   `${col}.type mismatch`).toBe(meta.type);
      expect(alertsColumns[col].format, `${col}.format mismatch`).toBe(meta.format);
    });
  }

  // ── Constraints ───────────────────────────────────────────────────────────────

  test('TC-DB07: id is the primary key', async ({ alertsColumns }) => {
    expect(alertsColumns.id.description as string).toContain('<pk/>');
  });

  test('TC-DB08: id has maxLength 36', async ({ alertsColumns }) => {
    expect(alertsColumns.id.maxLength).toBe(36);
  });

  test('TC-DB09: eval_run_id is a FK to eval_runs.id', async ({ alertsColumns }) => {
    expect(alertsColumns.eval_run_id.description as string).toContain("fk table='eval_runs' column='id'");
  });

  test('TC-DB10: eval_run_id has maxLength 36', async ({ alertsColumns }) => {
    expect(alertsColumns.eval_run_id.maxLength).toBe(36);
  });

  test('TC-DB11: severity has maxLength 50', async ({ alertsColumns }) => {
    expect(alertsColumns.severity.maxLength).toBe(50);
  });

  test('TC-DB12: created_at defaults to now()', async ({ alertsColumns }) => {
    expect(alertsColumns.created_at.default).toBe('now()');
  });

  // ── Access control ────────────────────────────────────────────────────────────

  test('TC-DB13: GET /alerts with service key returns 200 and an array', async ({ serviceRequest, supabaseUrl }) => {
    const res = await serviceRequest.get(`${supabaseUrl}/rest/v1/alerts`);
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('TC-DB14: GET /alerts without any key returns 401', async ({ request, supabaseUrl }) => {
    const res = await request.get(`${supabaseUrl}/rest/v1/alerts`);
    expect(res.status()).toBe(401);
  });

  test('TC-DB15: GET /alerts with anon key respects RLS (200 or 401/403)', async ({ anonRequest, supabaseUrl }) => {
    const res = await anonRequest.get(`${supabaseUrl}/rest/v1/alerts`);
    expect([200, 401, 403], `unexpected status ${res.status()} with anon key`).toContain(res.status());
  });

  // ── Query ─────────────────────────────────────────────────────────────────────

  test('TC-DB16: available tables in schema', async ({ schemaDefinitions }) => {
    const tables = Object.keys(schemaDefinitions);
    console.log('Available tables:', tables);
    expect(tables.length).toBeGreaterThan(0);
  });
});
