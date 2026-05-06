import { type Page } from '@playwright/test';
import { EventHubLogin } from '../utils/self-healing-locator';

export class LoginPage {
  constructor(private readonly page: Page) {}

  // ─── Locators ──────────────────────────────────────────────────────────────

  get pageHeading() {
    return this.page.getByRole('heading', { name: /Sign in to EventHub/i });
  }

  get subText() {
    return this.page.getByText('Enter your credentials to continue');
  }

  get emailInput() {
    return EventHubLogin.emailInput(this.page);
  }

  get passwordInput() {
    return EventHubLogin.passwordInput(this.page);
  }

  get signInButton() {
    return EventHubLogin.signInButton(this.page);
  }

  get registerLink() {
    return EventHubLogin.registerLink(this.page);
  }

  get forgotPasswordLink() {
    return EventHubLogin.forgotPasswordLink(this.page);
  }

  get errorMessage() {
    return EventHubLogin.errorMessage(this.page);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSignIn() {
    await this.signInButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickRegister() {
    await this.registerLink.click();
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async waitForLoginPage() {
    await this.page.waitForURL(/.*\/login|.*\/$/, { timeout: 10_000 });
  }

  async getErrorMessageText(): Promise<string> {
    return this.errorMessage.innerText();
  }
}
