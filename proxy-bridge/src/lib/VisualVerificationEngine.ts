import { ScreenshotAnalyzer } from './ScreenshotAnalyzer';
import { RuntimeBridge } from './RuntimeBridge';
import { Socket } from 'socket.io';

/**
 * VisualVerificationEngine: The "Autonomous Quality Assurance" layer.
 * Automatically verifies if an agent's code change matches the visual expectation.
 * Now expanded to "Interactive QA": handles clicks, typing, and semantic assertions.
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
   * Run an interactive 'smoke test' on a specific UI change.
   */
  async verifyTask(projectName: string, visualExpectation: string, testScenario?: string) {
    this.socket.emit('VERIFICATION_START', { projectName, expectation: visualExpectation });

    try {
      // 1. Interactive Phase: Execute semantic test scenario if provided
      if (testScenario) {
        console.log(`[QA] Running interaction scenario: ${testScenario}`);
        // The bridge executes real code actions (e.g. "click login", "type email")
        await this.bridge.executeRuntimeAction('RUN_SCENARIO', { script: testScenario });
      }

      // 2. State Verification: Check internal application state (Logic check)
      const appState = await this.bridge.executeRuntimeAction('GET_STATE', {});
      console.log(`[QA] Internal State check:`, appState);

      // 3. Visual Phase: Perform Visual Delta Analysis (Look check)
      const verification = await this.analyzer.verifyUIChange(visualExpectation);

      if (verification.success) {
        this.socket.emit('VERIFICATION_SUCCESS', { 
          message: `Verification complete: UI matches and logic is functional.`,
          snapshot: verification.timestamp 
        });
        return true;
      } else {
        this.socket.emit('VERIFICATION_FAILURE', { 
          reason: 'Visual mismatch or logic failure.',
          analysis: verification.analysis
        });
        return false;
      }
    } catch (error) {
      this.socket.emit('VERIFICATION_FAILURE', { reason: 'Runtime interaction failed.' });
      return false;
    }
  }
}
