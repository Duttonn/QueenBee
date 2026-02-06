export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or overwrite a file with new content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file from project root.' },
          content: { type: 'string', description: 'The full content to write to the file.' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the content of a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file.' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description: 'Execute a shell command in the project directory.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The bash command to execute.' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_worktree',
      description: 'Create a new isolated git worktree for a specific task. Use this to avoid breaking the main project.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Descriptive name for the worktree branch (e.g. "fix-ui-bug").' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_memory',
      description: 'Save important project-level findings, decisions, or cross-thread context to the shared MEMORY.md file. Use this to ensure other agents know about key architectural choices.',
      parameters: {
        type: 'object',
        properties: {
          category: { 
            type: 'string', 
            enum: ['architecture', 'conventions', 'knowledge', 'issues'],
            description: 'The section where this info belongs.' 
          },
          content: { type: 'string', description: 'The information to record.' }
        },
        required: ['category', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_memory',
      description: 'Read the shared project memory. Can read the whole summary or a specific category to save tokens.',
      parameters: {
        type: 'object',
        properties: {
          category: { 
            type: 'string', 
            enum: ['architecture', 'conventions', 'knowledge', 'issues'],
            description: 'Optional: filter by a specific section.' 
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spawn_worker',
      description: 'Spawn a new autonomous worker agent to handle a specific task. This worker will run in parallel in its own worktree.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The unique ID from TASKS.md (e.g. "FEAT-01").' },
          instructions: { type: 'string', description: 'Detailed instructions for the worker.' }
        },
        required: ['taskId', 'instructions']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'report_completion',
      description: 'Report that a task is finished. Use this as a worker to notify the orchestrator.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task completed.' },
          status: { type: 'string', enum: ['success', 'failed'], description: 'Outcome of the task.' },
          prUrl: { type: 'string', description: 'Link to the Pull Request if changes were made.' }
        },
        required: ['taskId', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_status',
      description: 'Check the status of all active workers and the progress of the TASKS.md file.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Optional: check a specific worker.' }
        }
      }
    }
  }
];
