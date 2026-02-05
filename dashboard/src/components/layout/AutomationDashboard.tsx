import React from 'react';

const AutomationJob = ({ name, schedule, status, lastRun }: any) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
      }`}>
        {status === 'active' ? '⚙️' : '⏸️'}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{name}</h4>
        <div className="flex gap-3 mt-1">
          <span className="text-[10px] text-slate-400 font-mono">🕒 {schedule}</span>
          <span className="text-[10px] text-slate-400 font-mono">📅 Last: {lastRun}</span>
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">📊</button>
      <button className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg uppercase">
        {status === 'active' ? 'Pause' : 'Resume'}
      </button>
    </div>
  </div>
);

const AutomationDashboard = () => {
  const jobs = [
    { id: 1, name: 'GSD Workspace Scan', schedule: '*/30 * * * *', status: 'active', lastRun: '10 min ago' },
    { id: 2, name: 'Blackjack Data Factory', schedule: '0 2 * * *', status: 'paused', lastRun: 'Yesterday' },
    { id: 3, name: 'GitHub/GitLab Repo Sync', schedule: '0 * * * *', status: 'active', lastRun: '22 min ago' },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Automation Engine</h2>
            <p className="text-slate-500 text-sm">Orchestrate recurring agent workloads and background jobs.</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-500 transition-all">
            + Create New Job
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Schedules</div>
          {jobs.map(job => (
            <AutomationJob key={job.id} {...job} />
          ))}
        </div>

        <div className="mt-12 bg-white rounded-3xl border border-slate-100 p-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Autonomous Recommendations</h3>
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="text-2xl">👑🐝</div>
            <div>
              <p className="text-xs text-slate-700 leading-relaxed">
                "I noticed you're working on the <strong>visionOS-MCP</strong> build pipeline. I recommend scheduling a nightly <strong>Build Test & Report</strong> job to catch errors early. Should I set this up for 3 AM?"
              </p>
              <button className="mt-3 text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">Yes, Schedule it</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationDashboard;
