import { browserControlService, BrowserControlService, ElementInfo } from './BrowserControlService';

/**
 * MCPBrowserBridge (P19-11)
 *
 * Wraps BrowserControlService to expose browser state as MCP resources
 * and provide browser control tools for agents.
 */
export class MCPBrowserBridge {
  private browserService: BrowserControlService;
  private consoleErrors: string[] = [];
  private consoleListenerAttached = false;

  constructor(service: BrowserControlService = browserControlService) {
    this.browserService = service;
  }

  private attachConsoleListener(): void {
    if (this.consoleListenerAttached) return;
    const page = (this.browserService as any).page;
    if (!page) return;
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
        if (this.consoleErrors.length > 100) this.consoleErrors.shift();
      }
    });
    this.consoleListenerAttached = true;
  }

  /**
   * Launch browser and connect to a URL.
   */
  async connect(url: string): Promise<{ connected: boolean; pageUrl: string; pageTitle: string }> {
    this.consoleListenerAttached = false;
    this.consoleErrors = [];
    const info = await this.browserService.launch(url);
    this.attachConsoleListener();
    return { connected: true, pageUrl: info.url, pageTitle: info.title };
  }

  /**
   * Get element info at page coordinates.
   */
  async elementAtPoint(x: number, y: number): Promise<ElementInfo> {
    return this.browserService.getElementAtPoint(x, y);
  }

  /**
   * Take a screenshot and send it to a vision LLM for verification.
   * Returns pass/fail + analysis.
   */
  async visualVerify(description: string, keyElements?: string[]): Promise<{
    passed: boolean;
    analysis: string;
    fidelityScore: number;
    screenshot: string;
  }> {
    const screenshot = await this.browserService.captureScreenshot();

    const { ScreenshotComparator } = await import('./ScreenshotComparator');
    const comparator = new ScreenshotComparator(process.cwd());
    const result = await comparator.visualVerifyWithLLM(screenshot, description, keyElements);

    return {
      passed: result.passed,
      analysis: result.analysis,
      fidelityScore: result.fidelityScore,
      screenshot,
    };
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

    this.attachConsoleListener();

    const url = page.url() as string;
    const title: string = await page.title();
    const rawDom: string = await page.content();
    const dom = rawDom.length > 5000 ? rawDom.substring(0, 5000) + '...[truncated]' : rawDom;

    const consoleErrors = [...this.consoleErrors];
    return { url, title, dom, consoleErrors };
  }

  async navigate(url: string): Promise<{ success: boolean }> {
    await this.browserService.navigate(url);
    return { success: true };
  }

  async screenshot(url?: string): Promise<{ base64: string }> {
    if (url) {
      await this.browserService.navigate(url);
    }
    const base64 = await this.browserService.captureScreenshot();
    return { base64 };
  }

  async click(selector: string): Promise<{ success: boolean }> {
    await this.browserService.click(selector);
    return { success: true };
  }

  async type(selector: string, text: string): Promise<{ success: boolean }> {
    await this.browserService.type(selector, text);
    return { success: true };
  }

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
