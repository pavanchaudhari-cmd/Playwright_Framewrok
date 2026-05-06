import { type Page } from '@playwright/test';
import { EventHubNav } from '../utils/self-healing-locator';

export class HomePage {
  constructor(private readonly page: Page) {}

  // ─── Hero Section ──────────────────────────────────────────────────────────

  get heroHeading() {
    return this.page.getByRole('heading', { name: /Discover & Book Amazing Events/i });
  }

  get browseEventsLink() {
    return this.page.getByRole('link', { name: /Browse Events/i }).first();
  }

  get myBookingsHeroBtn() {
    return this.page.getByRole('button', { name: /My Bookings/i });
  }

  // ─── Featured Events ───────────────────────────────────────────────────────

  get featuredEventsHeading() {
    return this.page.getByRole('heading', { name: 'Featured Events' });
  }

  get eventCards() {
    return this.page.locator('article');
  }

  eventHeading(name: string) {
    return this.page.getByRole('heading', { name });
  }

  // ─── Navbar ────────────────────────────────────────────────────────────────

  private get navbar() {
    return this.page.locator('nav').first();
  }

  get navHomeLink() {
    return this.navbar.getByRole('link', { name: 'Home' });
  }

  get navEventsLink() {
    return this.navbar.getByRole('link', { name: 'Events' });
  }

  get navMyBookingsLink() {
    return this.navbar.getByRole('link', { name: 'My Bookings' });
  }

  get navApiDocsLink() {
    return this.navbar.getByRole('link', { name: 'API Docs' });
  }

  get logoutBtn() {
    return EventHubNav.logoutButton(this.page);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto(baseUrl: string) {
    await this.page.goto(baseUrl);
  }

  async clickBrowseEvents() {
    await this.browseEventsLink.click();
  }

  async clickLogout() {
    await this.logoutBtn.click();
  }
}
