import { execSync } from 'child_process';
import axios from 'axios';
import path from 'path';
import { mcpBrowserBridge } from './MCPBrowserBridge';
import { browserControlService } from './BrowserControlService';

/**
 * MCPBridge: Standardized gateway for Model Context Protocol servers.
 *
 * P19-11: Auto-registers browser resources when BrowserControlService has
 * an active page connection.
 */
export class MCPBridge {
  private configPath = path.join(process.cwd(), '../architecture/MCP_CONFIG.json');

  /**
   * Returns true if the BrowserControlService currently has an active page.
   */
  private isBrowserAvailable(): boolean {
    return !!(browserControlService as any).page;
  }

  async callTool(serverName: string, toolName: string, args: any) {
    console.log(`[MCP] Calling ${serverName}/${toolName}`);

    // P19-11: Route browser/* resource requests to MCPBrowserBridge
    if (serverName === 'browser') {
      return this.callBrowserTool(toolName, args);
    }

    // Logic to route to visionOS-MCP or other local servers
    try {
      // Mocking internal routing
      return { status: 'success', result: 'Tool execution simulated' };
    } catch (e) {
      return { status: 'error', message: 'MCP Communication failed' };
    }
  }

  /**
   * Route a browser/* tool call to MCPBrowserBridge.
   */
  private async callBrowserTool(toolName: string, args: any): Promise<any> {
    try {
      switch (toolName) {
        case 'current_state':
          return await mcpBrowserBridge.getCurrentState();
        case 'navigate':
          return await mcpBrowserBridge.navigate(args.url);
        case 'screenshot':
          return await mcpBrowserBridge.screenshot(args.url);
        case 'click':
          return await mcpBrowserBridge.click(args.selector);
        case 'type':
          return await mcpBrowserBridge.type(args.selector, args.text);
        case 'get_dom':
          return await mcpBrowserBridge.getDom(args.selector);
        default:
          return { status: 'error', message: `Unknown browser tool: ${toolName}` };
      }
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  /**
   * List registered MCP resources.
   * Includes browser://current when BrowserControlService is connected.
   */
  getResources(): Array<{ uri: string; name: string; description: string }> {
    const resources: Array<{ uri: string; name: string; description: string }> = [];

    if (this.isBrowserAvailable()) {
      resources.push({
        uri: 'browser://current',
        name: 'Current Browser State',
        description: 'Live browser state: URL, title, DOM (truncated to 5000 chars), and console errors.',
      });
    }

    return resources;
  }

  async getScreenshot() {
    // Bridges to your visionOS-MCP screenshot tool
    return this.callTool('visionOS-MCP', 'screenshot', {});
  }
}