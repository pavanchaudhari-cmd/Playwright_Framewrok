import { type Page } from '@playwright/test';
import { EventHubEventsPage } from '../utils/self-healing-locator';

export class EventsPage {
  constructor(private readonly page: Page) {}

  // ─── Locators ──────────────────────────────────────────────────────────────

  get pageHeading() {
    return EventHubEventsPage.pageHeading(this.page);
  }

  get subText() {
    return this.page.getByText('Find your next unforgettable experience');
  }

  get searchBox() {
    return EventHubEventsPage.searchInput(this.page);
  }

  get categoryFilter() {
    return EventHubEventsPage.categoryFilter(this.page);
  }

  get cityFilter() {
    return this.page.locator('select').nth(1);
  }

  get eventCards() {
    return this.page.locator('article');
  }

  get bookNowLinks() {
    return this.page.getByRole('link', { name: 'Book Now' });
  }

  get addNewEventBtn() {
    return this.page.getByRole('button', { name: 'Add New Event' });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto(baseUrl: string) {
    await this.page.goto(`${baseUrl}events`);
  }

  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  async clickAddNewEvent() {
    await this.addNewEventBtn.click();
  }
}
