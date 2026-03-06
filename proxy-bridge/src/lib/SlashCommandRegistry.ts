import { SkillsManager } from './agents/SkillsManager';

/**
 * P19-14: SlashCommandRegistry
 *
 * Central registry for slash-command completions in the ComposerBar.
 * Combines built-in system commands with project-level Skills loaded
 * from .queenbee/skills/ via SkillsManager.
 */

export interface SlashCommand {
  /** e.g. 'inspect', 'swarm', 'evolve', 'memory' */
  name: string;
  description: string;
  /** Human-readable description of optional args */
  args?: string;
  /** true for built-in system commands */
  isSystem: boolean;
  /** set if backed by a SkillsManager skill */
  skillSlug?: string;
}

export class SlashCommandRegistry {
  private static readonly SYSTEM_COMMANDS: SlashCommand[] = [
    {
      name: 'inspect',
      description: 'Open Deep Inspector for current project',
      isSystem: true,
    },
    {
      name: 'swarm',
      description: 'Start Architect→Worker swarm mode',
      isSystem: true,
    },
    {
      name: 'evolve',
      description: 'Trigger GEA reflection and evolution',
      isSystem: true,
    },
    {
      name: 'memory',
      description: 'Show MemoryStore summary for current project',
      isSystem: true,
    },
    {
      name: 'portfolio',
      description: 'Open Portfolio view across all projects',
      isSystem: true,
    },
    {
      name: 'export',
      description: 'Export current session for another tool',
      args: '[claude-code|cursor|generic]',
      isSystem: true,
    },
  ];

  /**
   * Returns all commands whose name starts with `prefix` (case-insensitive).
   * Combines SYSTEM_COMMANDS with skills loaded from SkillsManager (keyed by
   * their name slug with a leading '/').
   *
   * @param prefix  The partial command name typed by the user (without the leading '/').
   * @param projectPath  Optional path to the project whose skills directory to load.
   */
  static async getCompletions(
    prefix: string,
    projectPath?: string
  ): Promise<SlashCommand[]> {
    const lower = prefix.toLowerCase();

    const systemMatches = SlashCommandRegistry.SYSTEM_COMMANDS.filter(cmd =>
      cmd.name.startsWith(lower)
    );

    const skillMatches: SlashCommand[] = [];
    if (projectPath) {
      try {
        const manager = new SkillsManager(projectPath);
        const skills = await manager.loadAll();
        for (const skill of skills) {
          const slug = skill.name.toLowerCase().replace(/\s+/g, '-');
          if (slug.startsWith(lower)) {
            skillMatches.push({
              name: slug,
              description: skill.description,
              isSystem: false,
              skillSlug: slug,
            });
          }
        }
      } catch {
        // Non-critical — skills dir may not exist yet
      }
    }

    return [...systemMatches, ...skillMatches];
  }

  /**
   * Returns the command definition for an exact name match, or null if not found.
   * Checks system commands first, then project skills.
   *
   * @param name  The exact command name (without the leading '/').
   * @param projectPath  Optional path to the project whose skills directory to load.
   */
  static async resolve(
    name: string,
    projectPath?: string
  ): Promise<SlashCommand | null> {
    const lower = name.toLowerCase();

    const system = SlashCommandRegistry.SYSTEM_COMMANDS.find(
      cmd => cmd.name === lower
    );
    if (system) return system;

    if (projectPath) {
      try {
        const manager = new SkillsManager(projectPath);
        const skills = await manager.loadAll();
        for (const skill of skills) {
          const slug = skill.name.toLowerCase().replace(/\s+/g, '-');
          if (slug === lower) {
            return {
              name: slug,
              description: skill.description,
              isSystem: false,
              skillSlug: slug,
            };
          }
        }
      } catch {
        // Non-critical
      }
    }

    return null;
  }
}
