import fs from 'fs-extra';
import path from 'path';
import { KnowledgeArtifactStore } from '../infrastructure/KnowledgeArtifactStore';
import { Paths } from '../infrastructure/Paths';

/**
 * SourceManager: Handles ingestion of local documents into the KnowledgeArtifactStore.
 * Inspired by NotebookLM's source processing flow.
 */
export interface Source {
  id: string;
  name: string;
  path: string;
  metadata: Record<string, any>;
}

export class SourceManager {
  private artifactStore: KnowledgeArtifactStore;

  constructor(private projectPath: string) {
    this.artifactStore = new KnowledgeArtifactStore(projectPath);
  }

  async uploadSource(filePath: string, metadata: Record<string, any> = {}): Promise<Source> {
    const absPath = path.resolve(this.projectPath, filePath);
    const content = await fs.readFile(absPath, 'utf-8');
    
    const sourceId = `src-${Date.now()}`;
    const source: Source = {
      id: sourceId,
      name: path.basename(filePath),
      path: filePath,
      metadata
    };

    // Store in artifacts as a 'discovery' type artifact
    await this.artifactStore.store({
      type: 'discovery',
      agentId: 'system',
      taskId: 'ingestion',
      summary: `Source: ${path.basename(filePath)}`,
      data: {
        filesDiscovered: [filePath],
        patternsFound: [],
        dependenciesIdentified: []
      },
      metadata: { ...metadata, sourceId, originalPath: filePath }
    } as any); // cast due to architecture mismatch in store signature

    return source;
  }

  async listSources(): Promise<Source[]> {
    const artifacts = await this.artifactStore.query({ type: 'discovery' });
    return artifacts
      .filter(a => a.summary?.startsWith('Source:'))
      .map(a => ({
        id: (a.data as any).sourceId,
        name: path.basename((a.data as any).originalPath),
        path: (a.data as any).originalPath,
        metadata: a.data as any
      }));
  }
}
