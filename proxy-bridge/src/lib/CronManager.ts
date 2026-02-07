import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { broadcast } from './socket-instance';

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
      console.error('[Scheduler] Failed to load jobs:', error);
    }
  }

  private async saveJobs() {
    try {
      await fs.ensureDir(path.dirname(this.storagePath));
      await fs.writeJson(this.storagePath, this.jobsData, { spaces: 2 });
    } catch (error) {
      console.error('[Scheduler] Failed to save jobs:', error);
    }
  }

  scheduleJob(job: AutomationJob) {
    if (this.jobs.has(job.id)) {
      this.jobs.get(job.id)?.stop();
    }

    const task = cron.schedule(job.schedule, async () => {
      console.log(`[Scheduler] Running job ${job.id} (${job.type})`);
      job.lastRun = new Date().toISOString();
      await this.saveJobs();
      
      broadcast('UI_UPDATE', {
        action: 'JOB_RUNNING',
        payload: { jobId: job.id, type: job.type, timestamp: job.lastRun }
      });

      // Execute logic based on type
      try {
        switch (job.type) {
          case 'GSD_SCAN':
            // Logic for scanning workspace
            break;
          case 'SYNC_REPOS':
            // Logic for syncing GitHub repos
            break;
          default:
            console.log(`[Scheduler] No logic implemented for job type ${job.type}`);
        }
      } catch (error) {
        console.error(`[Scheduler] Job ${job.id} failed:`, error);
      }
    });

    this.jobs.set(job.id, task);
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