import { type Page } from '@playwright/test';

export class EventDetailPage {
  constructor(private readonly page: Page) {}

  // ─── Event Info ────────────────────────────────────────────────────────────

  eventTitle(name: string) {
    return this.page.getByRole('heading', { name });
  }

  get categoryBadge() {
    return this.page.getByText('Conference', { exact: true });
  }

  get featuredBadge() {
    return this.page.getByText('Featured', { exact: true }).first();
  }

  get aboutHeading() {
    return this.page.getByRole('heading', { name: 'About this event' });
  }

  // ─── Booking Form ──────────────────────────────────────────────────────────

  get bookTicketsHeading() {
    return this.page.getByRole('heading', { name: 'Book Tickets' });
  }

  get fullNameInput() {
    return this.page.getByPlaceholder('Your full name');
  }

  get emailInput() {
    return this.page.getByPlaceholder('you@email.com');
  }

  get phoneInput() {
    return this.page.getByPlaceholder('+91 98765 43210');
  }

  get confirmBookingBtn() {
    return this.page.getByRole('button', { name: 'Confirm Booking' });
  }

  // ─── Ticket Counter ────────────────────────────────────────────────────────

  get decrementBtn() {
    return this.page.getByRole('button', { name: '−' });
  }

  get incrementBtn() {
    return this.page.getByRole('button', { name: '+' });
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  get breadcrumbEventsLink() {
    return this.page.locator('main').getByRole('link', { name: 'Events' });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto(baseUrl: string, eventId = 1) {
    await this.page.goto(`${baseUrl}events/${eventId}`);
  }

  async fillBookingForm(name: string, email: string, phone: string) {
    await this.fullNameInput.fill(name);
    await this.emailInput.fill(email);
    await this.phoneInput.fill(phone);
  }

  async clickConfirmBooking() {
    await this.confirmBookingBtn.click();
  }

  async incrementTickets() {
    await this.incrementBtn.click();
  }

  async clickEventsLink() {
    await this.breadcrumbEventsLink.click();
  }
}
