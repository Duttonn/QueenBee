import { SkillManifest } from '../types/skills';

export class SkillRegistry {
  private skills: Map<string, SkillManifest> = new Map();

  register(skill: SkillManifest) {
    this.skills.set(skill.id, skill);
  }

  getSkill(id: string): SkillManifest | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): SkillManifest[] {
    return Array.from(this.skills.values());
  }

  // Capability-based search
  findSkillsByCapability(capability: string): SkillManifest[] {
    return this.getAllSkills().filter(s => s.capabilities.includes(capability));
  }
}

export const skillRegistry = new SkillRegistry();
