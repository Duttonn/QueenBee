import { ScreenshotAnalyzer } from './ScreenshotAnalyzer';
import { RuntimeBridge } from './RuntimeBridge';
import { Socket } from 'socket.io';

/**
 * VisualVerificationEngine: The "Autonomous Quality Assurance" layer.
 * Automatically verifies if an agent's code change matches the visual expectation.
 */
export class VisualVerificationEngine {
  private analyzer: ScreenshotAnalyzer;
  private bridge: RuntimeBridge;
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
    this.analyzer = new ScreenshotAnalyzer();
    this.bridge = new RuntimeBridge(socket);
  }

  /**
   * Run a visual 'smoke test' on a specific UI change.
   */
  async verifyTask(projectName: string, visualExpectation: string) {
    this.socket.emit('VERIFICATION_START', { projectName, expectation: visualExpectation });

    // 1. Trigger Runtime Inspect to find the affected component
    const componentInfo = await this.bridge.inspectElement('auto-detect');
    
    // 2. Perform Visual Delta Analysis
    const verification = await this.analyzer.verifyUIChange(visualExpectation);

    if (verification.success) {
      this.socket.emit('VERIFICATION_SUCCESS', { 
        message: `Visual match confirmed: ${verification.analysis}`,
        snapshot: verification.timestamp 
      });
      return true;
    } else {
      this.socket.emit('VERIFICATION_FAILURE', { 
        reason: 'Visual mismatch detected between code and render.',
        analysis: verification.analysis
      });
      return false;
    }
  }
}
