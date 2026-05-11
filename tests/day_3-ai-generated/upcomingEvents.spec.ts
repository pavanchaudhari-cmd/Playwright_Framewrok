/* AI-GENERATED — Review required */

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * RECOMMENDED data-testid ATTRIBUTES TO ADD TO THE HTML
 * (attributes already present in the app are marked ✅)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ALREADY PRESENT:
 *   ✅ data-testid="event-card"          → <article> wrapping each event card
 *   ✅ data-testid="book-now-btn"        → <a> "Book Now" inside each card
 *   ✅ data-testid="nav-home"            → Home nav link
 *   ✅ data-testid="nav-events"          → Events nav link
 *   ✅ data-testid="nav-bookings"        → My Bookings nav link
 *   ✅ data-testid="user-email-display"  → Logged-in user email span
 *   ✅ data-testid="logout-btn"          → Logout button
 *
 * MISSING — RECOMMENDED TO ADD:
 *   data-testid="events-page-heading"   → <h1>Upcoming Events</h1>
 *   data-testid="search-input"          → Search text input
 *   data-testid="category-filter"       → Category <select>
 *   data-testid="city-filter"           → City <select>
 *   data-testid="event-title"           → <h3> event name inside each card
 *   data-testid="event-date"            → Date element inside each card
 *   data-testid="event-location"        → Location element inside each card
 *   data-testid="event-price"           → Price element inside each card
 *   data-testid="event-badge"           → Category badge chip inside each card
 *   data-testid="seats-available"       → Seats count element inside each card
 *   data-testid="no-results-message"    → Empty-state element when no events match
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../fixtures/auth_fixtures';
import { epic, feature, story, severity } from 'allure-js-commons';

const BASE_URL = 'https://eventhub.rahulshettyacademy.com';

test.describe('Upcoming Events Page', { tag: ['@ui', '@e2e', '@eventhub'] }, () => {

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/events');
    await authenticatedPage.waitForLoadState('networkidle');
    await epic('EventHub');
    await feature('Events');
  });

  // ── Main user flow ─────────────────────────────────────────────────────────

  test('TC01 - Browse events, search by name, and navigate to booking', async ({ page }) => {
    await story('Event Search & Booking');
    await severity('critical');

    await expect(
      page.getByRole('heading', { name: 'Upcoming Events', level: 1 })
    ).toBeVisible();

    const eventCards = page.locator('[data-testid="event-card"]');
    await expect(eventCards.first()).toBeVisible();

    await page.getByPlaceholder('Search events, venues…').fill('World Tech Summit');
    await expect(eventCards).toHaveCount(1, { timeout: 5000 });

    await expect(eventCards.first()).toContainText('World Tech Summit');

    await page.locator('[data-testid="book-now-btn"]').first().click();

    await expect(page).not.toHaveURL(`${BASE_URL}/events`, { timeout: 8000 });
  });

  // ── Edge-case tests ────────────────────────────────────────────────────────

  test('TC_EDGE_01 - Search with no matching text shows empty state or zero cards', async ({ page }) => {
    await story('Event Search & Booking');
    await severity('normal');

    await page.getByPlaceholder('Search events, venues…').fill('zzznonexistenteventxxx');

    const eventCards = page.locator('[data-testid="event-card"]');

    const zeroCards = async () => (await eventCards.count()) === 0;
    const noResultsVisible = () =>
      page.getByText(/no events found|no results/i).isVisible().catch(() => false);

    await expect(async () => {
      const empty = await zeroCards();
      const msg = await noResultsVisible();
      expect(empty || msg).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('TC_EDGE_02 - Category filter restricts cards to selected category', async ({ page }) => {
    await story('Event Filtering');
    await severity('normal');

    const eventCards = page.locator('[data-testid="event-card"]');

    await expect(async () => {
      expect(await eventCards.count()).toBeGreaterThan(1);
    }).toPass({ timeout: 8000 });
    const totalBefore = await eventCards.count();

    await page.locator('select').first().selectOption({ label: '🎙 Conference' });

    await expect(async () => {
      const n = await eventCards.count();
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(totalBefore);
    }).toPass({ timeout: 5000 });

    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(eventCards.nth(i)).toContainText('Conference');
    }
  });

  test('TC_EDGE_03 - City filter restricts cards to selected city', async ({ page }) => {
    await story('Event Filtering');
    await severity('normal');

    const eventCards = page.locator('[data-testid="event-card"]');

    await expect(async () => {
      expect(await eventCards.count()).toBeGreaterThan(1);
    }).toPass({ timeout: 8000 });
    const totalBefore = await eventCards.count();

    await page.locator('select').last().selectOption({ label: 'Hyderabad' });

    await expect(async () => {
      const n = await eventCards.count();
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(totalBefore);
    }).toPass({ timeout: 5000 });

    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(eventCards.nth(i)).toContainText('Hyderabad');
    }
  });
});
