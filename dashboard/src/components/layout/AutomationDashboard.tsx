import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  Calendar, 
  Activity, 
  CheckCircle, 
  XCircle,
  ChevronRight
} from 'lucide-react';

const AutomationJob = ({ job, onSelect }: any) => (
  <div 
    onClick={() => onSelect(job)}
    className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-blue-500/50 transition-all cursor-pointer group"
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        job.status === 'active' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-500'
      }`}>
        {job.status === 'active' ? <Activity size={18} className="animate-pulse" /> : <Pause size={18} />}
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-200 group-hover:text-white">{job.name}</h4>
        <div className="flex gap-3 mt-1 items-center">
          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono uppercase">
            {job.type}
          </span>
          <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
            <Clock size={10} /> {job.schedule}
          </span>
        </div>
      </div>
    </div>
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white">
        <Play size={14} />
      </button>
      <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400">
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

const HistoryLog = ({ logs }: any) => (
  <div className="w-80 bg-[#111] border-l border-gray-800 p-4 flex flex-col h-full">
    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Execution History</div>
    <div className="space-y-3 flex-1 overflow-auto">
      {logs.map((log: any, idx: number) => (
        <div key={idx} className="flex gap-3 items-start border-b border-gray-800 pb-3 last:border-0">
          <div className="mt-0.5">
            {log.status === 'success' ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>
          <div>
            <div className="text-xs font-medium text-gray-300">{log.jobName}</div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{log.timestamp}</div>
            {log.error && (
              <div className="mt-1 text-[10px] text-red-400 bg-red-900/10 p-1.5 rounded font-mono break-all">
                {log.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AutomationDashboard = () => {
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const jobs = [
    { id: 1, name: 'GSD Workspace Scan', type: 'GSD_SCAN', schedule: '*/30 * * * *', status: 'active' },
    { id: 2, name: 'Blackjack Data Factory', type: 'DATA_GEN', schedule: '0 2 * * *', status: 'paused' },
    { id: 3, name: 'GitHub/GitLab Repo Sync', type: 'SYNC_REPOS', schedule: '0 * * * *', status: 'active' },
  ];

  const logs = [
    { status: 'success', jobName: 'GSD Workspace Scan', timestamp: 'Today, 10:30 AM' },
    { status: 'failure', jobName: 'Blackjack Data Factory', timestamp: 'Yesterday, 2:00 AM', error: 'Connection timeout: ForgeAdapter' },
    { status: 'success', jobName: 'GitHub/GitLab Repo Sync', timestamp: 'Yesterday, 1:00 AM' },
    { status: 'success', jobName: 'GSD Workspace Scan', timestamp: 'Yesterday, 10:00 AM' },
  ];

  return (
    <div className="flex flex-1 h-full bg-[#0d0d0d] overflow-hidden">
      {/* Main Dashboard Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Automation Engine</h2>
              <p className="text-gray-500 text-sm mt-1">Orchestrate recurring agent workloads.</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all flex items-center gap-2">
              <PlusIcon /> Create Job
            </button>
          </div>

          {/* Active Schedules */}
          <div className="space-y-4 mb-10">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Active Schedules</div>
            {jobs.map(job => (
              <AutomationJob key={job.id} job={job} onSelect={setSelectedJob} />
            ))}
          </div>

          {/* Recommendations */}
          <div className="bg-[#1e1e1e] rounded-2xl border border-gray-800 p-6 relative overflow-hidden">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="flex items-start gap-4 relative z-10">
                <div className="text-2xl">👑🐝</div>
                <div>
                   <h3 className="text-sm font-bold text-white mb-1">Autonomous Insight</h3>
                   <p className="text-xs text-gray-400 leading-relaxed max-w-lg mb-3">
                      "I noticed you're working on the <strong>visionOS-MCP</strong> build pipeline. I recommend scheduling a nightly <strong>Build Test & Report</strong> job to catch errors early. Should I set this up for 3 AM?"
                   </p>
                   <button className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600/30 transition-colors">
                      Accept Recommendation
                   </button>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* History Side Panel */}
      <HistoryLog logs={logs} />
    </div>
  );
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
)

export default AutomationDashboard;
