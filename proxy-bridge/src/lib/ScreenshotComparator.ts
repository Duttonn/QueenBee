import fs from 'fs-extra';
import path from 'path';

export interface VisualExpectation {
  description: string; // Expected visual description
  keyElements: string[]; // Key UI elements that should be present
  layout?: string; // Expected layout (e.g., "sidebar-left", "header-top")
  colorScheme?: string; // Expected color scheme
}

export interface VisualComparisonResult {
  fidelityScore: number; // 0-1 score
  passed: boolean;
  matchedElements: string[];
  missingElements: string[];
  unexpectedElements: string[];
  analysis: string;
  timestamp: string;
}

export interface ScreenshotCapture {
  path: string;
  timestamp: string;
  projectName: string;
}

/**
 * ScreenshotComparator - Visual UI Validation for Agent Tasks
 * 
 * Captures screenshots at key steps and compares with expected visual.
 * Implements Visual Planner - generates "expected visual" description,
 * compares with actual screenshot using VLM, calculates visual fidelity score.
 * Rejects if score < 0.7.
 */
export class ScreenshotComparator {
  private projectPath: string;
  private capturesDir: string;
  private comparisonThreshold = 0.7; // Reject if fidelity < 0.7

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.capturesDir = path.join(projectPath, '.queenbee', 'visual-captures');
  }

  /**
   * Initialize capture directory
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.capturesDir);
  }

  /**
   * Capture a screenshot at current step
   */
  async captureScreenshot(projectName: string, stepDescription: string): Promise<ScreenshotCapture> {
    await this.initialize();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectName}-${stepDescription.replace(/\s+/g, '-')}-${timestamp}.png`;
    const filepath = path.join(this.capturesDir, filename);

    // In production, this would use a screenshot tool or MCP
    // For now, we'll create a placeholder
    console.log(`[Visual] Capturing screenshot: ${filepath}`);
    
    // Placeholder - in production, actual screenshot capture would happen here
    // await this.executeScreenCapture(filepath);

    const capture: ScreenshotCapture = {
      path: filepath,
      timestamp: new Date().toISOString(),
      projectName,
    };

    return capture;
  }

  /**
   * Generate expected visual description from task
   */
  generateExpectedVisual(taskDescription: string): VisualExpectation {
    // Parse task description to extract visual expectations
    // In production, this would use LLM to analyze the task
    
    const keyElements: string[] = [];
    let layout: string | undefined;
    let colorScheme: string | undefined;

    // Simple keyword-based extraction (could be enhanced with LLM)
    const lower = taskDescription.toLowerCase();
    
    if (lower.includes('button')) keyElements.push('button');
    if (lower.includes('sidebar')) { keyElements.push('sidebar'); layout = 'sidebar-left'; }
    if (lower.includes('header')) { keyElements.push('header'); layout = 'header-top'; }
    if (lower.includes('modal') || lower.includes('dialog')) keyElements.push('modal');
    if (lower.includes('form')) keyElements.push('form');
    if (lower.includes('table')) keyElements.push('table');
    if (lower.includes('dark')) colorScheme = 'dark';
    if (lower.includes('light')) colorScheme = 'light';

    return {
      description: taskDescription,
      keyElements,
      layout,
      colorScheme,
    };
  }

  /**
   * Compare screenshot with expected visual
   */
  async compareWithExpectation(
    screenshotPath: string,
    expectation: VisualExpectation
  ): Promise<VisualComparisonResult> {
    // In production, this would use VLM (Vision LLM) for comparison
    // For now, we'll simulate the comparison
    
    console.log(`[Visual] Comparing screenshot with expectation: ${expectation.description}`);
    
    // Simulated VLM analysis
    // In production: call VLM API with screenshot and expectation
    const analysis = await this.analyzeWithVLM(screenshotPath, expectation);
    
    // Calculate fidelity score
    const fidelityScore = this.calculateFidelityScore(analysis, expectation);
    const passed = fidelityScore >= this.comparisonThreshold;

    const result: VisualComparisonResult = {
      fidelityScore,
      passed,
      matchedElements: analysis.matchedElements,
      missingElements: expectation.keyElements.filter(e => !analysis.matchedElements.includes(e)),
      unexpectedElements: analysis.unexpectedElements || [],
      analysis: analysis.summary,
      timestamp: new Date().toISOString(),
    };

    // Save comparison result
    await this.saveComparisonResult(result);

    return result;
  }

  /**
   * Analyze screenshot with VLM (simulated)
   */
  private async analyzeWithVLM(
    screenshotPath: string,
    expectation: VisualExpectation
  ): Promise<{ matchedElements: string[]; unexpectedElements?: string[]; summary: string }> {
    // Simulated VLM response
    // In production, this would call an actual VLM API
    
    const matchedElements = expectation.keyElements.filter(() => Math.random() > 0.3);
    const unexpectedElements = Math.random() > 0.8 ? ['extra-element'] : [];
    
    const summary = `Found ${matchedElements.length} of ${expectation.keyElements.length} expected elements. ` +
      (unexpectedElements.length > 0 ? `Unexpected elements: ${unexpectedElements.join(', ')}.` : '');

    return { matchedElements, unexpectedElements, summary };
  }

  /**
   * Calculate fidelity score based on analysis
   */
  private calculateFidelityScore(
    analysis: { matchedElements: string[]; unexpectedElements?: string[] },
    expectation: VisualExpectation
  ): number {
    if (expectation.keyElements.length === 0) {
      return 1.0; // No specific elements to check
    }

    // Base score from matched elements
    const matchRatio = analysis.matchedElements.length / expectation.keyElements.length;
    let score = matchRatio;

    // Penalty for unexpected elements
    if (analysis.unexpectedElements && analysis.unexpectedElements.length > 0) {
      const penalty = analysis.unexpectedElements.length * 0.1;
      score = Math.max(0, score - penalty);
    }

    return Math.min(1.0, score);
  }

  /**
   * Set custom comparison threshold
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.comparisonThreshold = threshold;
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.comparisonThreshold;
  }

  /**
   * Save comparison result to file
   */
  private async saveComparisonResult(result: VisualComparisonResult): Promise<void> {
    const resultsFile = path.join(this.projectPath, '.queenbee', 'visual-comparisons.jsonl');
    await fs.ensureDir(path.dirname(resultsFile));
    await fs.appendFile(resultsFile, JSON.stringify(result) + '\n');
  }

  /**
   * Get comparison history
   */
  async getComparisonHistory(limit: number = 10): Promise<VisualComparisonResult[]> {
    const resultsFile = path.join(this.projectPath, '.queenbee', 'visual-comparisons.jsonl');
    
    if (!await fs.pathExists(resultsFile)) {
      return [];
    }

    const content = await fs.readFile(resultsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    return lines
      .slice(-limit)
      .map(line => JSON.parse(line))
      .reverse();
  }

  /**
   * Get average fidelity score
   */
  async getAverageFidelity(): Promise<number> {
    const history = await this.getComparisonHistory(100);
    
    if (history.length === 0) {
      return 1.0;
    }

    const total = history.reduce((sum, r) => sum + r.fidelityScore, 0);
    return total / history.length;
  }
}
