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
      description: 'Read the content of a file. If the file is large (>200 lines), it returns a summary (line count + symbol map). Use read_file_range for specific windows.',
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
      name: 'read_file_range',
      description: 'Read a specific range of lines from a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file.' },
          start: { type: 'number', description: 'Starting line number (1-indexed).' },
          end: { type: 'number', description: 'Ending line number (inclusive).' }
        },
        required: ['path', 'start', 'end']
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
  },
  {
    type: 'function',
    function: {
      name: 'plan_tasks',
      description: 'Initialize or update the project TASKS.md with a structured plan. Use this as an Orchestrator to define the project roadmap.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The full Markdown content for TASKS.md.' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Add a single task to an existing phase in TASKS.md.',
      parameters: {
        type: 'object',
        properties: {
          phase: { type: 'string', description: 'The phase name (e.g. "PHASE 2: FEATURES").' },
          taskId: { type: 'string', description: 'Unique ID (e.g. "FEAT-02").' },
          description: { type: 'string', description: 'What needs to be done.' }
        },
        required: ['phase', 'taskId', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'claim_task',
      description: 'Mark a task as in-progress in TASKS.md. Use this when starting to work on a task.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to claim.' }
        },
        required: ['taskId']
      }
    }
  },
    {
      type: 'function',
      function: {
        name: 'submit_proposal',
        description: 'Submit a proposal for a risky action or architectural change. The proposal will be pending until approved.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Description of the proposed action.' },
            reason: { type: 'string', description: 'Reason why this action is necessary.' }
          },
          required: ['action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'chat_with_team',
        description: 'Send a message to the shared team channel to coordinate with other agents or ask for status.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The message to send to your teammates.' },
            taskId: { type: 'string', description: 'Optional: The task ID this message relates to.' }
          },
          required: ['content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'teach_agent',
        description: 'Explicitly teach the agent a new stylistic rule or personal preference. This will be remembered in future sessions.',
        parameters: {
          type: 'object',
          properties: {
            rule: { type: 'string', description: 'The rule to learn (e.g. "Always use camelCase for variables").' },
            type: { type: 'string', enum: ['style', 'preference', 'lesson'], description: 'The type of learning.' }
          },
          required: ['rule']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'learn_style',
        description: 'Before writing code, use this to analyze existing files and learn the user\'s coding style for a specific file type.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The path of the file you are about to create or modify (to find similar files).' }
          },
          required: ['path']
        }
      }
    }
  ];
  