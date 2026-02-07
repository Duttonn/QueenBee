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
  type: 'GSD_SCAN' | 'SYNC_REPOS' | 'DATA_GEN' | 'MAINTENANCE';
  schedule: string; // Cron format
  projectId?: string;
  projectPath?: string;
  lastRun?: string;
  status: 'active' | 'paused';
}

/**
 * CronManager: Manages recurring agent tasks using node-cron.
 */
export class CronManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobsData: AutomationJob[] = [];
  private storagePath: string;

  constructor() {
    this.storagePath = path.join(Paths.getProxyBridgeDataDir(), 'automation_jobs.json');
    this.loadJobs();
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

  scheduleJob(job: AutomationJob) {
    if (this.jobs.has(job.id)) {
      this.jobs.get(job.id)?.stop();
    }

    // Validate cron expression
    if (!cron.validate(job.schedule)) {
      console.error(`[CronManager] Invalid schedule for job ${job.id}: ${job.schedule}`);
      return;
    }

    const task = cron.schedule(job.schedule, async () => {
      console.log(`[CronManager] Running job ${job.id} (${job.type})`);
      job.lastRun = new Date().toISOString();
      await this.saveJobs();
      
      broadcast('UI_UPDATE', {
        action: 'JOB_RUNNING',
        payload: { jobId: job.id, type: job.type, timestamp: job.lastRun }
      });

      // Execute logic based on type
      try {
        switch (job.type) {
          case 'SYNC_REPOS':
            await this.handleSyncRepos(job);
            break;
          case 'GSD_SCAN':
            await this.handleGsdScan(job);
            break;
          case 'MAINTENANCE':
            await this.handleMaintenance(job);
            break;
          default:
            console.log(`[CronManager] No logic implemented for job type ${job.type}`);
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
    console.log('[CronManager] Handling SYNC_REPOS...');
    const db = getDb();
    
    for (const project of db.projects) {
      // For the prototype, we assume if project has a fullName or is type 'cloud', we might find its repo
      // In a real impl, we'd store the owner/repo explicitly
      if (project.type === 'cloud' || project.name.includes('/')) {
        const parts = project.name.split('/');
        if (parts.length === 2) {
          console.log(`[CronManager] Syncing issues for ${project.name}`);
          await githubSyncService.syncIssuesToTasks(parts[0], parts[1], project.path);
        }
      }
    }
  }

  private async handleGsdScan(job: AutomationJob) {
    console.log('[CronManager] Handling GSD_SCAN...');
    const projectPath = job.projectPath || Paths.getWorkspaceRoot();
    
    // Trigger background agentic scan
    // We create a mock socket for the runner since there's no active user session
    const mockSocket = { 
      emit: (event: string, data: any) => console.log(`[BackgroundAgent] ${event}`, data) 
    } as any;
    
    const runner = new AutonomousRunner(mockSocket, projectPath);
    await runner.executeLoop("Perform a full scan of the workspace and update GSD_TASKS.md if necessary.");
  }

  private async handleMaintenance(job: AutomationJob) {
    console.log('[CronManager] Handling MAINTENANCE...');
    // Cleanup old worktrees or temp files
    const worktreesDir = Paths.getWorktreesDir();
    if (await fs.pathExists(worktreesDir)) {
      const entries = await fs.readdir(worktreesDir);
      const now = Date.now();
      for (const entry of entries) {
        const fullPath = path.join(worktreesDir, entry);
        const stats = await fs.stat(fullPath);
        // Delete worktrees older than 7 days
        if (now - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
          console.log(`[CronManager] Cleaning up old worktree: ${entry}`);
          await fs.remove(fullPath);
        }
      }
    }
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

  getJobs() {
    return this.jobsData;
  }
}

export const cronManager = new CronManager();