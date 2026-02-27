import { browserControlService, BrowserControlService } from './BrowserControlService';

/**
 * MCPBrowserBridge (P19-11)
 *
 * Wraps BrowserControlService to expose browser state as MCP resources
 * and provide browser control tools for agents.
 */
export class MCPBrowserBridge {
  private browserService: BrowserControlService;

  constructor(service: BrowserControlService = browserControlService) {
    this.browserService = service;
  }

  /**
   * MCP resource: browser://current
   * Returns current page URL, title, truncated DOM, and captured console errors.
   */
  async getCurrentState(): Promise<{
    url: string;
    title: string;
    dom: string;
    consoleErrors: string[];
  }> {
    const page = (this.browserService as any).page;
    if (!page) {
      return { url: '', title: '', dom: '', consoleErrors: [] };
    }

    const url = page.url() as string;
    const title: string = await page.title();
    const rawDom: string = await page.content();
    const dom = rawDom.length > 5000 ? rawDom.substring(0, 5000) + '...[truncated]' : rawDom;

    // Collect console errors via CDP
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    return { url, title, dom, consoleErrors };
  }

  /**
   * Navigate the browser to a URL.
   */
  async navigate(url: string): Promise<{ success: boolean }> {
    await this.browserService.navigate(url);
    return { success: true };
  }

  /**
   * Take a screenshot of the current page (or navigate to url first).
   * Returns base64-encoded PNG.
   */
  async screenshot(url?: string): Promise<{ base64: string }> {
    if (url) {
      await this.browserService.navigate(url);
    }
    const base64 = await this.browserService.captureScreenshot();
    return { base64 };
  }

  /**
   * Click an element identified by CSS selector.
   */
  async click(selector: string): Promise<{ success: boolean }> {
    await this.browserService.click(selector);
    return { success: true };
  }

  /**
   * Type text into an element identified by CSS selector.
   */
  async type(selector: string, text: string): Promise<{ success: boolean }> {
    await this.browserService.type(selector, text);
    return { success: true };
  }

  /**
   * Get the outer HTML of an element (or full body if no selector given).
   */
  async getDom(selector?: string): Promise<{ html: string; selector: string }> {
    const page = (this.browserService as any).page;
    if (!page) {
      throw new Error('No active browser page. Call browser_navigate first.');
    }

    const resolvedSelector = selector || 'body';
    const html: string = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      return el ? el.outerHTML : `<error>Element not found: ${sel}</error>`;
    }, resolvedSelector);

    return { html, selector: resolvedSelector };
  }
}

export const mcpBrowserBridge = new MCPBrowserBridge();
