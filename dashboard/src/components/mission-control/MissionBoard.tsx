import React from 'react';
import { AgentFleetMonitor } from './AgentFleetMonitor';
import { CostSentinel } from './CostSentinel';

export const MissionBoard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <AgentFleetMonitor />
        <CostSentinel />
      </div>
      <div className="p-6 bg-slate-900 text-white rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Task Backlog</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <h3 className="text-sm uppercase text-slate-400 mb-2">Backlog</h3>
          </div>
          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <h3 className="text-sm uppercase text-slate-400 mb-2">In Progress</h3>
          </div>
          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <h3 className="text-sm uppercase text-slate-400 mb-2">Done</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
