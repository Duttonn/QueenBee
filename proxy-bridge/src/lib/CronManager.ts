import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';
import { githubSyncService } from './GitHubSyncService';
import { AutonomousRunner } from './AutonomousRunner';
import { getDb } from './db';

export interface AutomationJob {
  id: string;
  type?: 'GSD_SCAN' | 'SYNC_REPOS' | 'PR_REVIEW' | 'CHANGELOG' | 'DATA_GEN' | 'CI_MONITOR' | 'RELEASE_NOTES' | 'TEST_NIGHTLY' | 'MAINTENANCE';
  title?: string;
  schedule: string; // Cron format
  script?: string;
  projectId?: string;
  projectPath?: string;
  lastRun?: string;
  status?: 'active' | 'paused';
  active?: boolean;
}

/**
 * CronManager: Manages recurring agent tasks using node-cron.
 */
export class CronManager {
  private jobs: Map<string, any> = new Map();
  private jobsData: AutomationJob[] = [];
  private storagePath: string;

  constructor() {
    this.storagePath = path.join(Paths.getProxyBridgeDataDir(), 'automation_jobs.json');
  }

  async init() {
    await this.loadJobs();
  }

  private async loadJobs() {
    try {
      if (await fs.pathExists(this.storagePath)) {
        this.jobsData = await fs.readJson(this.storagePath);
        this.jobsData.forEach(job => {
          if (job.status === 'active') {
            this.scheduleJob(job);
          }
        });
      }
    } catch (error) {
      console.error('[CronManager] Failed to load jobs:', error);
    }
  }

  private async saveJobs() {
    try {
      await fs.ensureDir(path.dirname(this.storagePath));
      await fs.writeJson(this.storagePath, this.jobsData, { spaces: 2 });
    } catch (error) {
      console.error('[CronManager] Failed to save jobs:', error);
    }
  }

  private convertToCron(time: string): string {
    if (cron.validate(time)) return time;
    
    // Check if it's HH:MM format
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const [_, hour, minute] = match;
      return `${parseInt(minute)} ${parseInt(hour)} * * *`;
    }
    
    return time; // Return original and let validator handle it
  }

  scheduleJob(job: AutomationJob) {
    if (this.jobs.has(job.id)) {
      this.jobs.get(job.id)?.stop();
    }

    const cronSchedule = this.convertToCron(job.schedule);

    if (!cron.validate(cronSchedule)) {
      console.error(`[CronManager] Invalid schedule for job ${job.id}: ${job.schedule} (Resolved to: ${cronSchedule})`);
      return;
    }

    const task = cron.schedule(cronSchedule, async () => {
      const jobType = job.type || (job.title?.toLowerCase().includes('sync') ? 'SYNC_REPOS' : 'MAINTENANCE');
      console.log(`[CronManager] Running job ${job.id} (${jobType})`);
      job.lastRun = new Date().toISOString();
      await this.saveJobs();
      
      broadcast('UI_UPDATE', {
        action: 'JOB_RUNNING',
        payload: { jobId: job.id, type: jobType, timestamp: job.lastRun }
      });

      try {
        switch (jobType) {
          case 'SYNC_REPOS':
            await this.handleSyncRepos(job);
            break;
          case 'GSD_SCAN':
            await this.handleGsdScan(job);
            break;
          case 'MAINTENANCE':
            await this.handleMaintenance(job);
            break;
          case 'PR_REVIEW':
          case 'CHANGELOG':
          case 'DATA_GEN':
          case 'CI_MONITOR':
          case 'RELEASE_NOTES':
          case 'TEST_NIGHTLY':
            await this.handleAgentJob(job);
            break;
          default:
            console.log(`[CronManager] No specific logic implemented for job type ${jobType}, falling back to general agent job`);
            await this.handleAgentJob(job);
        }
        
        broadcast('UI_UPDATE', {
          action: 'JOB_COMPLETED',
          payload: { jobId: job.id, status: 'success' }
        });
      } catch (error: any) {
        console.error(`[CronManager] Job ${job.id} failed:`, error);
        broadcast('UI_UPDATE', {
          action: 'JOB_FAILED',
          payload: { jobId: job.id, error: error.message }
        });
      }
    });

    this.jobs.set(job.id, task);
  }

  private async handleSyncRepos(job: AutomationJob) {
    const db = getDb();
    for (const project of db.projects) {
      if (project.type === 'cloud' || project.name.includes('/')) {
        const parts = project.name.split('/');
        if (parts.length === 2) {
          await githubSyncService.syncIssuesToTasks(parts[0], parts[1], project.path);
        }
      }
    }
  }

  private async handleGsdScan(job: AutomationJob) {
    const projectPath = job.projectPath || Paths.getWorkspaceRoot();
    const mockSocket = { 
      emit: (event: string, data: any) => console.log(`[BackgroundAgent] ${event}`, data) 
    } as any;
    const runner = new AutonomousRunner(mockSocket, projectPath, 'auto', null, null, 'local');
    await runner.executeLoop("Perform a full scan of the workspace and update GSD_TASKS.md if necessary.");
  }

  private async handleMaintenance(job: AutomationJob) {
    const worktreesDir = Paths.getWorktreesDir();
    if (await fs.pathExists(worktreesDir)) {
      const entries = await fs.readdir(worktreesDir);
      const now = Date.now();
      for (const entry of entries) {
        const fullPath = path.join(worktreesDir, entry);
        const stats = await fs.stat(fullPath);
        if (now - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
          await fs.remove(fullPath);
        }
      }
    }
  }

  private async handleAgentJob(job: AutomationJob) {
    const projectPath = job.projectPath || Paths.getWorkspaceRoot();
    const instruction = job.script || `Perform background task for type: ${job.type}`;
    
    console.log(`[CronManager] Spawning agent for job ${job.id} with instruction: ${instruction}`);
    
    const mockSocket = { 
      emit: (event: string, data: any) => console.log(`[BackgroundAgent] ${event}`, data) 
    } as any;
    
    const runner = new AutonomousRunner(mockSocket, projectPath, 'auto', null, null, 'local');
    await runner.executeLoop(instruction);
  }

  addJob(job: Omit<AutomationJob, 'id'>) {
    const newJob: AutomationJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'active'
    };
    this.jobsData.push(newJob);
    this.scheduleJob(newJob);
    this.saveJobs();
    return newJob;
  }

  pauseJob(id: string) {
    const job = this.jobsData.find(j => j.id === id);
    if (job) {
      job.status = 'paused';
      this.jobs.get(id)?.stop();
      this.saveJobs();
    }
  }

  resumeJob(id: string) {
    const job = this.jobsData.find(j => j.id === id);
    if (job) {
      job.status = 'active';
      this.scheduleJob(job);
      this.saveJobs();
    }
  }

  deleteJob(id: string) {
    this.jobs.get(id)?.stop();
    this.jobs.delete(id);
    this.jobsData = this.jobsData.filter(j => j.id !== id);
    this.saveJobs();
  }

  stopJob(id: string) {
    this.jobs.get(id)?.stop();
  }

  getJobs() {
    return this.jobsData;
  }
}

export const cronManager = new CronManager();