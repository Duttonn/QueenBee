export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error';
  currentTask: string;
  tokensUsed: number;
}

export const mockAgents: Agent[] = [
  { id: '1', name: 'Frontend Architect', status: 'running', currentTask: 'Refactoring dashboard components', tokensUsed: 1250 },
  { id: '2', name: 'Test Runner', status: 'idle', currentTask: 'None', tokensUsed: 450 },
  { id: '3', name: 'Browser Automation Agent', status: 'running', currentTask: 'Crawling documentation', tokensUsed: 8900 },
];

export interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'in-progress' | 'done';
  assignee: string;
}

export const mockTasks: Task[] = [
  { id: 't1', title: 'Implement WebSocket relay', status: 'in-progress', assignee: '1' },
  { id: 't2', title: 'Connect Mission Control UI', status: 'backlog', assignee: '' },
  { id: 't3', title: 'Setup Pinchtab service', status: 'done', assignee: '3' },
];
