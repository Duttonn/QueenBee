import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

export class ConfigLoader {
  private configDir = path.join(process.cwd(), '../config/local');

  async loadLocalConfigs() {
    const files = await fs.readdir(this.configDir);
    const configs = [];
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.json')) {
        const content = await fs.readFile(path.join(this.configDir, file), 'utf-8');
        configs.push(yaml.load(content));
      }
    }
    return configs;
  }

  async getDassaultHeaders(modelName: string) {
    const configs = await this.loadLocalConfigs();
    const model = (configs[0] as any).models.find((m: any) => m.name === modelName);
    return model?.requestOptions?.headers || {};
  }
}