import puppeteer, { Browser, Page } from 'puppeteer-core';
import { broadcast } from './infrastructure/socket-instance';

export interface ElementInfo {
  selector: string;
  tagName: string;
  id: string;
  classes: string[];
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  outerHTML: string;
  textContent: string;
  sourceFile?: string;
  sourceLine?: string;
}

export interface BoundingBoxInfo {
  selector: string;
  tagName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageInfo {
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * BrowserControlService: CDP Bridge for agent-browser interaction.
 */
export class BrowserControlService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private _connected = false;

  get isConnected(): boolean {
    return this._connected && this.browser !== null && this.page !== null;
  }

  /**
   * Launch a headless Chromium instance and navigate to the given URL.
   * Uses puppeteer-core — expects chromium findable via the default channel.
   */
  async launch(url: string): Promise<PageInfo> {
    // Close any existing connection first
    if (this.browser) {
      await this.disconnect();
    }

    console.log(`[BrowserControl] Launching browser for ${url}`);
    this.browser = await puppeteer.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      defaultViewport: { width: 1280, height: 800 },
    });
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    this._connected = true;

    const info = await this.getPageInfo();
    broadcast('BROWSER_CONNECTED', info);
    console.log('[BrowserControl] Connected and navigated.');
    return info;
  }

  async connect(wsUrl: string) {
    console.log(`[BrowserControl] Connecting to CDP at ${wsUrl}`);
    this.browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    this._connected = true;
    broadcast('BROWSER_CONNECTED', await this.getPageInfo());
    console.log('[BrowserControl] Connected successfully.');
  }

  async getPageInfo(): Promise<PageInfo> {
    if (!this.page) throw new Error('No active page');
    const url = this.page.url();
    const title = await this.page.title();
    const viewport = this.page.viewport();
    return {
      url,
      title,
      viewportWidth: viewport?.width ?? 1280,
      viewportHeight: viewport?.height ?? 800,
    };
  }

  async captureScreenshot(): Promise<string> {
    if (!this.page) throw new Error('No active page');
    const screenshot = await this.page.screenshot({ encoding: 'base64' });
    return screenshot as string;
  }

  async getAriaTree(): Promise<any> {
    if (!this.page) throw new Error('No active page');
    const snapshot = await (this.page as any).accessibility.snapshot();
    return snapshot;
  }

  /**
   * Get the element at a specific page coordinate using document.elementFromPoint.
   */
  async getElementAtPoint(x: number, y: number): Promise<ElementInfo> {
    if (!this.page) throw new Error('No active page');

    const info = await this.page.evaluate((px: number, py: number) => {
      const el = document.elementFromPoint(px, py);
      if (!el) return null;

      const rect = el.getBoundingClientRect();

      // Build a reasonable CSS selector
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.classList.length > 0) {
        selector += '.' + Array.from(el.classList).join('.');
      }

      // Try to read source-map attributes injected by React dev mode / babel plugins
      const sourceFile = el.getAttribute('data-source-file') || el.getAttribute('data-sentry-source-file') || undefined;
      const sourceLine = el.getAttribute('data-source-line') || el.getAttribute('data-sentry-source-line') || undefined;

      return {
        selector,
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        classes: Array.from(el.classList),
        boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        outerHTML: el.outerHTML.length > 2000 ? el.outerHTML.substring(0, 2000) + '...' : el.outerHTML,
        textContent: (el.textContent || '').substring(0, 500),
        sourceFile,
        sourceLine,
      };
    }, x, y);

    if (!info) throw new Error(`No element found at (${x}, ${y})`);
    return info as ElementInfo;
  }

  /**
   * Get bounding boxes for elements matching a selector (or all interactive elements if no selector).
   */
  async getElementBoundingBoxes(selector?: string): Promise<BoundingBoxInfo[]> {
    if (!this.page) throw new Error('No active page');

    const sel = selector || 'a, button, input, select, textarea, [role="button"], [onclick]';

    return this.page.evaluate((s: string) => {
      const els = document.querySelectorAll(s);
      return Array.from(els).slice(0, 200).map(el => {
        const rect = el.getBoundingClientRect();
        let css = el.tagName.toLowerCase();
        if (el.id) css = `#${el.id}`;
        else if (el.classList.length > 0) css += '.' + Array.from(el.classList).join('.');

        return {
          selector: css,
          tagName: el.tagName.toLowerCase(),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      }).filter(b => b.width > 0 && b.height > 0);
    }, sel);
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
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
  }

  /**
   * Inject react-grab into the current page (and all future navigations).
   * Uses the public CDN bundle so it works without a local install in the target app.
   */
  async injectReactGrab(): Promise<void> {
    if (!this.page) throw new Error('No active page');
    const CDN = 'https://unpkg.com/react-grab/dist/index.global.js';
    // Persist across navigations
    await (this.page as any).addScriptToEvaluateOnNewDocument({ url: CDN });
    // Inject into the currently-loaded page
    await (this.page as any).addScriptTag({ url: CDN });
  }

  /**
   * Return the nearest React component name + source file at a page coordinate.
   * Walks the React Fiber tree without requiring react-grab to be injected.
   * Returns null if the element has no React fiber or React is not present.
   */
  async getReactContext(x: number, y: number): Promise<{
    componentName: string | null;
    fileName: string | null;
    lineNumber: number | null;
  } | null> {
    if (!this.page) throw new Error('No active page');
    return this.page.evaluate((px: number, py: number) => {
      const el = document.elementFromPoint(px, py);
      if (!el) return null;

      // Find the React fiber key on this element or any ancestor
      const getFiber = (node: Element | null): any => {
        while (node) {
          const key = Object.keys(node).find(
            k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
          );
          if (key) return (node as any)[key];
          node = node.parentElement;
        }
        return null;
      };

      const fiber = getFiber(el);
      if (!fiber) return null;

      // Walk up the Fiber return chain to find a user-land component
      const isUserComponent = (name: string) =>
        name && /^[A-Z]/.test(name) &&
        !['Suspense', 'StrictMode', 'Fragment', 'Profiler', 'Router', 'Route'].includes(name);

      let f = fiber.return;
      while (f) {
        const type = f.type;
        const name: string | null = type
          ? (type.displayName || type.name || null)
          : null;
        if (name && isUserComponent(name)) {
          // Try to extract source location from _debugSource (React dev builds)
          const src = f._debugSource;
          return {
            componentName: name,
            fileName: src?.fileName ?? null,
            lineNumber: src?.lineNumber ?? null,
          };
        }
        f = f.return;
      }

      return { componentName: null, fileName: null, lineNumber: null };
    }, x, y);
  }

  async disconnect() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Already disconnected
      }
      this.browser = null;
      this.page = null;
      this._connected = false;
      broadcast('BROWSER_DISCONNECTED', {});
    }
  }
}

export const browserControlService = new BrowserControlService();
