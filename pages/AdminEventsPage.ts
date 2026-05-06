import { type Page } from '@playwright/test';

export class AdminEventsPage {
  constructor(private readonly page: Page) {}

  // ─── Add New Event Form ────────────────────────────────────────────────────

  get newEventHeading() {
    return this.page.getByRole('heading', { name: '+ New Event' });
  }

  get titleInput() {
    return this.page.getByPlaceholder('Event title');
  }

  get descriptionInput() {
    return this.page.getByPlaceholder('Describe the event…');
  }

  get categoryDropdown() {
    return this.page.getByRole('combobox', { name: /category/i });
  }

  get firstSelect() {
    return this.page.locator('select[name], select').first();
  }

  get cityInput() {
    return this.page.getByPlaceholder('e.g. Bangalore');
  }

  get venueInput() {
    return this.page.getByPlaceholder('Venue name & address');
  }

  get addEventBtn() {
    return this.page.getByRole('button', { name: '+ Add Event' });
  }

  // ─── All Events Table ──────────────────────────────────────────────────────

  get allEventsHeading() {
    return this.page.getByRole('heading', { name: 'All Events' });
  }

  get tableRows() {
    return this.page.locator('tbody tr');
  }

  columnHeader(name: string) {
    return this.page.getByRole('columnheader', { name });
  }

  eventCell(name: string | RegExp) {
    return this.page.getByRole('cell', { name });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto(baseUrl: string) {
    await this.page.goto(`${baseUrl}admin/events`);
  }
}
