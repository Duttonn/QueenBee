import React from 'react';
import { useHiveStore } from '../../store/useHiveStore';
import { mockAgents } from './mockData';

export const AgentFleetMonitor: React.FC = () => {
  // Eventually connect to actual state
  const agents = mockAgents;

  return (
    <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Agent Fleet</h2>
      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between bg-slate-800 p-4 rounded border border-slate-700">
            <div>
              <div className="text-white font-medium">{agent.name}</div>
              <div className="text-xs text-slate-400">{agent.currentTask}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs ${
                agent.status === 'running' ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-300'
              }`}>
                {agent.status}
              </span>
              <span className="text-slate-400 font-mono text-sm">{agent.tokensUsed} tokens</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
