import puppeteer, { Browser, Page } from 'puppeteer-core';
import { broadcast } from './socket-instance';

/**
 * BrowserControlService: CDP Bridge for agent-browser interaction.
 */
export class BrowserControlService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async connect(wsUrl: string) {
    console.log(`[BrowserControl] Connecting to CDP at ${wsUrl}`);
    this.browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    console.log('[BrowserControl] Connected successfully.');
  }

  async captureScreenshot(): Promise<string> {
    if (!this.page) throw new Error('No active page');
    const screenshot = await this.page.screenshot({ encoding: 'base64' });
    return screenshot as string;
  }

  async getAriaTree(): Promise<any> {
    if (!this.page) throw new Error('No active page');
    // Simplified ARIA tree capture
    const snapshot = await (this.page as any).accessibility.snapshot();
    return snapshot;
  }

  async click(selector: string) {
    if (!this.page) throw new Error('No active page');
    await this.page.click(selector);
  }

  async type(selector: string, text: string) {
    if (!this.page) throw new Error('No active page');
    await this.page.type(selector, text);
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('No active page');
    await this.page.goto(url);
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
      this.page = null;
    }
  }
}

export const browserControlService = new BrowserControlService();