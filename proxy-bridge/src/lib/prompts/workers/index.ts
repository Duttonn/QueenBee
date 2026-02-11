import { UI_BEE_PROMPT } from './ui-bee';
import { LOGIC_BEE_PROMPT } from './logic-bee';
import { TEST_BEE_PROMPT } from './test-bee';

export type WorkerType = 'UI_BEE' | 'LOGIC_BEE' | 'TEST_BEE';

export function getWorkerPrompt(type: WorkerType): string {
  switch (type) {
    case 'UI_BEE': return UI_BEE_PROMPT;
    case 'LOGIC_BEE': return LOGIC_BEE_PROMPT;
    case 'TEST_BEE': return TEST_BEE_PROMPT;
    default: return 'You are a generic worker bee agent.';
  }
}
