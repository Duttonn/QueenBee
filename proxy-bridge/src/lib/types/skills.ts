export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  parameters: {
    name: string;
    description: string;
    type: string;
    required: boolean;
  }[];
  capabilities: string[];
  riskLevel: 'low' | 'medium' | 'high';
}
