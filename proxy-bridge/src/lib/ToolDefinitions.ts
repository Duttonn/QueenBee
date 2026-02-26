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
      description: 'Read the shared project memory. Can read the whole summary or a specific category to save tokens. If you have a specific memory entry ID (e.g. from teach_agent), pass it as `id` to retrieve that entry along with its semantically, temporally, and causally linked entries.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['architecture', 'conventions', 'knowledge', 'issues'],
            description: 'Optional: filter by a specific section (reads MEMORY.md).'
          },
          id: {
            type: 'string',
            description: 'Optional: a specific MemoryStore entry UUID. When provided, returns this entry plus its graph-linked context (semantic, temporal, causal neighbors).'
          },
          depth: {
            type: 'integer',
            minimum: 0,
            maximum: 2,
            description: 'Graph traversal depth when using `id`. 0 = only the entry itself, 1 = entry + direct neighbors (default). Max 2.'
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
    },
    {
      type: 'function',
      function: {
        name: 'scout_project',
        description: 'Get a high-level overview of the project structure, key files, and technical stack. Use this as Step 1 of a deep codebase analysis.',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'prompt_agent',
        description: 'Directly prompt another agent with a specific question or request. Creates a structured dialogue turn. Use this for bidirectional communication - agents should actually talk to each other!',
        parameters: {
          type: 'object',
          properties: {
            targetAgent: { type: 'string', description: 'The agent to prompt (e.g., "ui-bee", "logic-bee", "test-bee", or "all" for broadcast).' },
            act: { type: 'string', enum: ['REQUEST', 'QUESTION', 'PROVIDE', 'AGREE', 'DISAGREE'], description: 'The type of dialogue act.' },
            content: { type: 'string', description: 'The message to send to the other agent.' },
            context: { type: 'string', description: 'Optional: Relevant code or file context to share with the prompt.' },
            requiresResponse: { type: 'boolean', description: 'Whether you expect a response. Default true for questions.' }
          },
          required: ['targetAgent', 'act', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'respond_to_prompt',
        description: 'Respond to a prompt you received from another agent. Use this to reply to specific questions or requests from teammates.',
        parameters: {
          type: 'object',
          properties: {
            promptId: { type: 'string', description: 'The ID of the prompt you are responding to.' },
            response: { type: 'string', description: 'Your response to the prompt.' }
          },
          required: ['promptId', 'response']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'share_with_agent',
        description: 'Share relevant memories or context with another agent. This helps coordinate by sharing what you have learned.',
        parameters: {
          type: 'object',
          properties: {
            targetAgent: { type: 'string', description: 'The agent to share with.' },
            query: { type: 'string', description: 'What context or memories to share (search terms).' },
            reason: { type: 'string', description: 'Why this is relevant to the other agent.' }
          },
          required: ['targetAgent', 'query', 'reason']
        }
      }
    },

  // ============== LS-01: Work Environment ==============
  {
    type: 'function',
    function: {
      name: 'set_work_environment',
      description: 'Lock which files this task is allowed to modify. Call this before starting work to prevent scope drift. Other agents cannot safely write to these files while you have them scoped.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID you are working on (e.g. "FEAT-02").' },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths or glob patterns allowed (e.g. "src/auth/**/*.ts").'
          },
          notes: { type: 'string', description: 'Why this scope was chosen.' }
        },
        required: ['taskId', 'files']
      }
    }
  },

  // ============== LS-02: Findings Blackboard ==============
  {
    type: 'function',
    function: {
      name: 'write_finding',
      description: 'Save a structured research finding to the project knowledge base (.queenbee/findings.json). Use this instead of chat_with_team when you want findings to be searchable and persistent.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title for the finding.' },
          content: { type: 'string', description: 'The detailed finding content.' },
          taskId: { type: 'string', description: 'Task this finding relates to.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for filtering (e.g. ["security", "auth"]).' },
          confidence: { type: 'number', description: 'Your confidence in this finding (0-1). Default 0.8.' }
        },
        required: ['title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_findings',
      description: 'Query the structured findings knowledge base. Filter by taskId, tags, or get all recent findings.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Filter by task ID.' },
          agentId: { type: 'string', description: 'Filter by agent that wrote the finding.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (OR match).' },
          limit: { type: 'number', description: 'Max findings to return. Default 20.' }
        }
      }
    }
  },

  // ============== LS-03: Swarm Context ==============
  {
    type: 'function',
    function: {
      name: 'read_swarm_context',
      description: 'Get a unified snapshot of the swarm state in one call: mission, task counts, recent roundtable messages, top memories, and open proposals. Use this to ground yourself at the start of a session instead of making 4+ separate calls.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // ============== LS-04: Proposal Debate ==============
  {
    type: 'function',
    function: {
      name: 'challenge_proposal',
      description: 'Challenge a pending proposal as Devil\'s Advocate. Provide specific risks, unresolved questions, and severity. This starts the Free-MAD debate cycle before a judge finalizes the outcome.',
      parameters: {
        type: 'object',
        properties: {
          proposalId: { type: 'string', description: 'ID of the proposal to challenge.' },
          risks: { type: 'array', items: { type: 'string' }, description: 'Specific failure modes (not vague — e.g. "XSS via localStorage").' },
          questions: { type: 'array', items: { type: 'string' }, description: 'Unresolved assumptions that need answers.' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Overall severity of the challenge.' }
        },
        required: ['proposalId', 'risks', 'questions', 'severity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'judge_proposal',
      description: 'Judge a proposal with a confidence score. Determines the outcome: ≥90=ship, ≥80=approved, ≥70=mutation_required, ≥60=mutation_major, <60=rejected. stressor is REQUIRED if confidence < 80.',
      parameters: {
        type: 'object',
        properties: {
          proposalId: { type: 'string', description: 'ID of the proposal to judge.' },
          confidence: { type: 'number', description: 'Your confidence score 0-100.' },
          reasoning: { type: 'string', description: 'Your reasoning for this score.' },
          stressor: { type: 'string', description: 'REQUIRED if confidence < 80. Specific actionable concern (e.g. "No error handling on DB disconnect").' }
        },
        required: ['proposalId', 'confidence', 'reasoning']
      }
    }
  },

  // ============== LS-07: Autonomous Recovery ==============
  {
    type: 'function',
    function: {
      name: 'request_help',
      description: 'Broadcast a help request to the roundtable when you are stuck. Use after 3 failed attempts. Teammates with the needed capability will respond. Do NOT use for first attempt.',
      parameters: {
        type: 'object',
        properties: {
          problem: { type: 'string', description: 'Exactly what you are stuck on.' },
          context: { type: 'string', description: 'What you have already tried.' },
          capability_needed: { type: 'string', description: 'Skill or knowledge needed (e.g. "JWT cryptography", "CSS grid").' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How urgently you need help.' }
        },
        required: ['problem', 'capability_needed']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_expert',
      description: 'Route a specific problem to a specialist agent type. Use when you need deep domain expertise beyond your current capabilities.',
      parameters: {
        type: 'object',
        properties: {
          expert_type: {
            type: 'string',
            enum: ['UI_BEE', 'LOGIC_BEE', 'DATA_BEE', 'SECURITY_BEE', 'ARCHITECT_BEE'],
            description: 'Type of specialist to route to.'
          },
          problem: { type: 'string', description: 'Detailed description of the problem.' },
          files_involved: { type: 'array', items: { type: 'string' }, description: 'Files relevant to the problem.' },
          context: { type: 'string', description: 'What you have tried so far.' }
        },
        required: ['expert_type', 'problem']
      }
    }
  }
  ];
  