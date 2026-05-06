import { type Page } from '@playwright/test';

export class MyBookingsPage {
  constructor(private readonly page: Page) {}

  // ─── Locators ──────────────────────────────────────────────────────────────

  get pageHeading() {
    return this.page.getByRole('heading', { name: 'My Bookings' });
  }

  get subText() {
    return this.page.getByText('View and manage all your ticket bookings');
  }

  get clearAllBookingsBtn() {
    return this.page.getByRole('button', { name: 'Clear all bookings' });
  }

  get noBookingsHeading() {
    return this.page.getByRole('heading', { name: 'No bookings yet' });
  }

  get browseEventsBtn() {
    return this.page.getByRole('button', { name: 'Browse Events' });
  }

  get cancelBookingBtns() {
    return this.page.getByRole('button', { name: 'Cancel Booking' });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto(baseUrl: string) {
    await this.page.goto(`${baseUrl}bookings`);
  }

  async clearAllBookings() {
    if (await this.clearAllBookingsBtn.isVisible()) {
      await this.clearAllBookingsBtn.click();
    }
  }

  async clickBrowseEvents() {
    await this.browseEventsBtn.click();
  }

  async hasBookings(): Promise<boolean> {
    await Promise.race([
      this.cancelBookingBtns.first().waitFor({ state: 'visible', timeout: 10_000 }),
      this.noBookingsHeading.waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => {});
    return (await this.cancelBookingBtns.count()) > 0;
  }
}
