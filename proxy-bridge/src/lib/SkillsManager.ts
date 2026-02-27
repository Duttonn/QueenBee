/**
 * P18-11: SkillsManager — reusable workflow templates (Skills system)
 *
 * Skills are YAML-frontmatter workflow definition files in `.queenbee/skills/`.
 * They encode repeatable coding patterns and are matched against task descriptions
 * using BM25-style TF-IDF scoring.
 *
 * Inspired by: accomplish, goclaw, oh-my-opencode, hermes-agent (4 independent convergences).
 *
 * Skill YAML format:
 * ---
 * name: add-api-endpoint
 * description: Add a new REST API endpoint with validation and tests
 * triggers: [endpoint, api, route, controller, handler]
 * steps:
 *   - Define the route schema in the types file
 *   - Implement the handler with input validation
 *   - Add the route to the router
 *   - Write unit tests for the new endpoint
 * success_criteria:
 *   - Route returns correct HTTP status codes
 *   - Tests pass with npm test
 * ---
 */

import fs from 'fs-extra';
import path from 'path';

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  steps: string[];
  success_criteria: string[];
}

export class SkillsManager {
  private skillsDir: string;

  constructor(projectPath: string) {
    this.skillsDir = path.join(projectPath, '.queenbee', 'skills');
  }

  /** Load all skills from the skills directory. */
  async loadAll(): Promise<Skill[]> {
    if (!(await fs.pathExists(this.skillsDir))) return [];

    const files = await fs.readdir(this.skillsDir);
    const skills: Skill[] = [];

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
      try {
        const content = await fs.readFile(path.join(this.skillsDir, file), 'utf-8');
        const skill = this.parseSkill(content);
        if (skill) skills.push(skill);
      } catch { /* skip malformed */ }
    }

    return skills;
  }

  /** Load a skill by name. */
  async load(name: string): Promise<Skill | null> {
    const candidates = [`${name}.yaml`, `${name}.yml`];
    for (const c of candidates) {
      const file = path.join(this.skillsDir, c);
      if (await fs.pathExists(file)) {
        const content = await fs.readFile(file, 'utf-8');
        return this.parseSkill(content);
      }
    }
    return null;
  }

  /**
   * Match a task description against all skills using BM25-style scoring.
   * Returns the best-matching skill, or null if no strong match.
   */
  async matchBest(taskDescription: string, threshold = 0.15): Promise<Skill | null> {
    const skills = await this.loadAll();
    if (skills.length === 0) return null;

    const taskWords = new Set(
      taskDescription.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    );

    let bestScore = 0;
    let bestSkill: Skill | null = null;

    for (const skill of skills) {
      const score = this.scoreSkill(skill, taskWords);
      if (score > bestScore) {
        bestScore = score;
        bestSkill = skill;
      }
    }

    return bestScore >= threshold ? bestSkill : null;
  }

  /** Format a skill as a context injection for the system prompt. */
  static formatSkillContext(skill: Skill): string {
    return `## Matched Skill: ${skill.name}
${skill.description}

### Steps to follow:
${skill.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Success criteria:
${skill.success_criteria.map(c => `- ${c}`).join('\n')}
`;
  }

  /** Ensure the skills directory exists with default starter skills. */
  async ensureDefaults(): Promise<void> {
    await fs.ensureDir(this.skillsDir);

    const defaults: Array<{ name: string; content: string }> = [
      {
        name: 'add-api-endpoint',
        content: `name: add-api-endpoint
description: Add a new REST API endpoint with validation and tests
triggers: [endpoint, api, route, controller, handler, rest]
steps:
  - Define the request/response types in the relevant types file
  - Implement the handler function with input validation
  - Add the route to the router/app with correct HTTP method
  - Write unit tests covering happy path and error cases
success_criteria:
  - Route handles invalid input gracefully with correct HTTP status
  - Unit tests pass with npm test
`,
      },
      {
        name: 'write-unit-test',
        content: `name: write-unit-test
description: Write comprehensive unit tests for a function or module
triggers: [test, spec, unit, coverage, jest, vitest, assert]
steps:
  - Read the target function/module to understand its contract
  - Identify happy path, edge cases, and error scenarios
  - Write describe block with meaningful test names
  - Mock external dependencies
  - Add assertions for return values and side effects
success_criteria:
  - All test cases pass
  - Edge cases and error paths are covered
`,
      },
      {
        name: 'add-react-component',
        content: `name: add-react-component
description: Add a new React component with TypeScript props and basic tests
triggers: [component, react, tsx, ui, frontend, widget]
steps:
  - Define TypeScript interface for component props
  - Implement the component with proper typing
  - Export from index file if applicable
  - Write a basic render test
success_criteria:
  - Component renders without errors
  - TypeScript types are correct
`,
      },
      {
        name: 'fix-bug',
        content: `name: fix-bug
description: Diagnose and fix a reported bug with test coverage
triggers: [bug, fix, broken, error, crash, issue, failing]
steps:
  - Read the error message and stack trace carefully
  - Identify the root cause (not just the symptom)
  - Make the minimal targeted fix
  - Add a regression test that would have caught this bug
  - Verify no other code paths are affected
success_criteria:
  - Bug is fixed
  - Regression test added and passing
  - No new test failures introduced
`,
      },
      {
        name: 'refactor-to-async',
        content: `name: refactor-to-async
description: Convert synchronous code to async/await pattern
triggers: [async, await, promise, callback, synchronous, refactor]
steps:
  - Identify all synchronous operations to convert
  - Add async/await to function signatures
  - Convert callbacks to promises where needed
  - Update all callers to await the new async functions
  - Run tests to verify behavior unchanged
success_criteria:
  - No blocking synchronous operations remain
  - All tests pass
  - Error handling uses try/catch
`,
      },
    ];

    for (const { name, content } of defaults) {
      const file = path.join(this.skillsDir, `${name}.yaml`);
      if (!(await fs.pathExists(file))) {
        await fs.writeFile(file, content, 'utf-8');
      }
    }
  }

  private scoreSkill(skill: Skill, taskWords: Set<string>): number {
    const skillWords = new Set([
      ...skill.triggers.map(t => t.toLowerCase()),
      ...skill.name.split('-').map(w => w.toLowerCase()),
      ...skill.description.toLowerCase().split(/\W+/),
    ]);

    let matches = 0;
    for (const word of taskWords) {
      if (skillWords.has(word)) matches++;
    }

    return taskWords.size > 0 ? matches / taskWords.size : 0;
  }

  /** Minimal YAML parser for skill files (handles simple key: value and list items). */
  private parseSkill(content: string): Skill | null {
    try {
      const lines = content.replace(/^---\n?/, '').replace(/\n?---$/, '').split('\n');
      const result: Record<string, any> = { triggers: [], steps: [], success_criteria: [] };
      let currentList: string | null = null;

      for (const line of lines) {
        const listItem = line.match(/^\s+-\s+(.+)/);
        const keyVal = line.match(/^(\w[\w_-]*):\s*(.*)/);

        if (listItem && currentList) {
          result[currentList].push(listItem[1].trim());
        } else if (keyVal) {
          const key = keyVal[1];
          const val = keyVal[2].trim();

          if (val.startsWith('[') && val.endsWith(']')) {
            result[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
            currentList = null;
          } else if (val === '') {
            currentList = key;
          } else {
            result[key] = val;
            currentList = null;
          }
        }
      }

      if (!result.name || !result.description) return null;
      return result as Skill;
    } catch {
      return null;
    }
  }
}
