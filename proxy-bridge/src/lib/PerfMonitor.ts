import { execSync } from 'child_process';

/**
 * PerfMonitor: Monitors VPS resources and application performance metrics.
 * Triggers findings in the Inbox if anomalies are detected.
 */
export class PerfMonitor {
  async runAudit(projectPath: string) {
    console.log(`[PerfMonitor] Starting audit for ${projectPath}`);
    const metrics: any = {
      timestamp: new Date().toISOString(),
      cpuUsage: 0,
      memoryUsage: 0,
      warnings: []
    };

    try {
      // 1. Check VPS Load
      const load = execSync("uptime | awk -F'load average:' '{ print \$2 }'").toString().trim();
      metrics.cpuUsage = load;

      // 2. Simple bundle size check for web projects
      if (execSync(`find ${projectPath} -name "package.json"`).toString()) {
        const nodeModulesSize = execSync(`du -sh ${projectPath}/node_modules 2>/dev/null | cut -f1`).toString().trim();
        metrics.nodeModulesSize = nodeModulesSize;
      }

      console.log(`[PerfMonitor] Audit complete: ${JSON.stringify(metrics)}`);
      return metrics;
    } catch (e) {
      return { status: 'error', message: 'Performance audit failed' };
    }
  }
}
