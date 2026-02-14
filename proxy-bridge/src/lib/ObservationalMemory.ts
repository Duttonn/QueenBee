import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

export interface Observation {
  id: string;
  timestamp: string;
  type: 'action' | 'result' | 'error' | 'reflection' | 'decision';
  content: string;
  context?: Record<string, any>;
  tags: string[];
}

export interface Reflection {
  id: string;
  timestamp: string;
  observations: string[];
  insight: string;
  confidence: number;
  actionable: boolean;
}

export interface MemorySnapshot {
  id: string;
  timestamp: string;
  observations: Observation[];
  reflections: Reflection[];
  context: Record<string, any>;
}

export class ObservationalMemory extends EventEmitter {
  private projectPath: string;
  private dataDir: string;
  private observations: Map<string, Observation> = new Map();
  private reflections: Map<string, Reflection> = new Map();
  private maxObservations: number;
  private maxReflections: number;
  private reflectionInterval: number;
  private reflectionTimer?: NodeJS.Timeout;
  private pendingObservations: string[] = [];

  constructor(projectPath: string, options?: { maxObservations?: number; maxReflections?: number; reflectionIntervalMs?: number }) {
    super();
    this.projectPath = projectPath;
    this.dataDir = path.join(Paths.getProjectDataDir(projectPath), 'observational-memory');
    this.maxObservations = options?.maxObservations || 1000;
    this.maxReflections = options?.maxReflections || 100;
    this.reflectionInterval = options?.reflectionIntervalMs || 300000;
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.dataDir);
    await this.loadMemory();
    this.startReflectionTimer();
    this.emit('initialized');
  }

  async loadMemory(): Promise<void> {
    const observationsFile = path.join(this.dataDir, 'observations.json');
    const reflectionsFile = path.join(this.dataDir, 'reflections.json');
    try {
      if (await fs.pathExists(observationsFile)) {
        const data = await fs.readJson(observationsFile);
        for (const obs of data) {
          this.observations.set(obs.id, obs);
        }
      }
      if (await fs.pathExists(reflectionsFile)) {
        const data = await fs.readJson(reflectionsFile);
        for (const ref of data) {
          this.reflections.set(ref.id, ref);
        }
      }
    } catch (error) {
      console.error('[ObservationalMemory] Failed to load memory:', error);
    }
  }

  async saveMemory(): Promise<void> {
    const observationsFile = path.join(this.dataDir, 'observations.json');
    const reflectionsFile = path.join(this.dataDir, 'reflections.json');
    try {
      await fs.writeJson(observationsFile, Array.from(this.observations.values()));
      await fs.writeJson(reflectionsFile, Array.from(this.reflections.values()));
    } catch (error) {
      console.error('[ObservationalMemory] Failed to save memory:', error);
    }
  }

  private startReflectionTimer(): void {
    if (this.reflectionTimer) clearInterval(this.reflectionTimer);
    this.reflectionTimer = setInterval(() => this.performReflection(), this.reflectionInterval);
  }

  async observe(type: Observation['type'], content: string, context?: Record<string, any>, tags: string[] = []): Promise<Observation> {
    const observation: Observation = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      content,
      context,
      tags,
    };
    this.observations.set(observation.id, observation);
    this.pendingObservations.push(observation.id);
    this.pruneObservations();
    this.emit('observation', observation);
    await this.saveMemory();
    return observation;
  }

  async reflect(insight: string, confidence: number = 0.5): Promise<Reflection> {
    const reflection: Reflection = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      observations: [...this.pendingObservations],
      insight,
      confidence: Math.max(0, Math.min(1, confidence)),
      actionable: confidence > 0.7,
    };
    this.reflections.set(reflection.id, reflection);
    this.pendingObservations = [];
    this.pruneReflections();
    this.emit('reflection', reflection);
    await this.saveMemory();
    return reflection;
  }

  private async performReflection(): Promise<void> {
    const recent = this.getRecentObservations(10);
    if (recent.length < 3) return;
    const patterns = this.detectPatterns(recent);
    if (patterns.length > 0) {
      const insight = `Detected ${patterns.length} pattern(s): ${patterns.join(', ')}`;
      await this.reflect(insight, 0.6);
    }
  }

  private detectPatterns(observations: Observation[]): string[] {
    const patterns: string[] = [];
    const errorCount = observations.filter(o => o.type === 'error').length;
    if (errorCount > observations.length * 0.3) patterns.push('high error rate');
    const actionCount = observations.filter(o => o.type === 'action').length;
    const resultCount = observations.filter(o => o.type === 'result').length;
    if (actionCount > resultCount * 2) patterns.push('unmatched actions');
    return patterns;
  }

  getRecentObservations(count: number): Observation[] {
    return Array.from(this.observations.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, count);
  }

  getRecentReflections(count: number): Reflection[] {
    return Array.from(this.reflections.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, count);
  }

  searchObservations(query: string): Observation[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.observations.values()).filter(obs => obs.content.toLowerCase().includes(lowerQuery) || obs.tags.some(tag => tag.toLowerCase().includes(lowerQuery)));
  }

  searchReflections(query: string): Reflection[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.reflections.values()).filter(ref => ref.insight.toLowerCase().includes(lowerQuery));
  }

  getActionableReflections(): Reflection[] {
    return Array.from(this.reflections.values()).filter(ref => ref.actionable && ref.confidence > 0.7);
  }

  private pruneObservations(): void {
    if (this.observations.size > this.maxObservations) {
      const sorted = Array.from(this.observations.entries()).sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime());
      const toRemove = sorted.slice(0, this.observations.size - this.maxObservations);
      for (const [id] of toRemove) this.observations.delete(id);
    }
  }

  private pruneReflections(): void {
    if (this.reflections.size > this.maxReflections) {
      const sorted = Array.from(this.reflections.entries()).sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime());
      const toRemove = sorted.slice(0, this.reflections.size - this.maxReflections);
      for (const [id] of toRemove) this.reflections.delete(id);
    }
  }

  async createSnapshot(): Promise<MemorySnapshot> {
    const snapshot: MemorySnapshot = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      observations: this.getRecentObservations(100),
      reflections: this.getRecentReflections(20),
      context: { projectPath: this.projectPath },
    };
    const snapshotFile = path.join(this.dataDir, `snapshot-${snapshot.id}.json`);
    await fs.writeJson(snapshotFile, snapshot);
    return snapshot;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown(): Promise<void> {
    if (this.reflectionTimer) clearInterval(this.reflectionTimer);
    await this.saveMemory();
    this.emit('shutdown');
  }
}

export function createObservationalMemory(projectPath: string, options?: { maxObservations?: number; maxReflections?: number; reflectionIntervalMs?: number }): ObservationalMemory {
  return new ObservationalMemory(projectPath, options);
}
