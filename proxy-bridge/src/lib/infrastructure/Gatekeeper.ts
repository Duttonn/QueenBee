import { broadcast } from '../infrastructure/socket-instance';
import { SkillManifest } from '../types/skills';

/**
 * Gatekeeper: Checks tool signatures for high-risk capabilities and requires
 * user approval before execution if thresholds are met.
 */
export class Gatekeeper {
  static async check(
    tool: SkillManifest,
    argumentsData: Record<string, any>,
    sessionId: string
  ): Promise<boolean> {
    if (tool.riskLevel === 'high') {
      console.warn(`[Gatekeeper] High-risk tool detected: ${tool.id}. Requesting approval.`);
      
      broadcast('TOOL_APPROVAL_REQUIRED', {
        toolId: tool.id,
        args: argumentsData,
        sessionId
      });
      
      // In a real implementation, this would wait for a socket event resolution.
      // For now, we return false to block until approved.
      return false;
    }
    
    return true;
  }
}
