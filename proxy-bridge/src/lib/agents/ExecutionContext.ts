import { LLMMessage } from '../types/llm';
import { ToolExecutor } from '../tools/ToolExecutor';
import { ContextCompressor } from './ContextCompressor';

/**
 * ExecutionContext maintains the state and context for an agent session.
 * Decoupled from the session management logic.
 */
export interface ExecutionContext {
  messages: LLMMessage[];
  projectPath: string;
  maxSteps: number;
  threadId: string | null;
  providerId: string;
  apiKey: string | null;
  mode: string;
  sessionFiles: Set<string>;
  contextCompressor: ContextCompressor;
  toolExecutor: ToolExecutor;
}
