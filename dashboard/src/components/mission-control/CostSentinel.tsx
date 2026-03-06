import React from 'react';

export const CostSentinel: React.FC = () => {
  return (
    <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Cost Sentinel</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded border border-slate-700">
          <div className="text-sm text-slate-400">Total Spend</div>
          <div className="text-2xl font-mono text-green-400">$2.45</div>
        </div>
        <div className="bg-slate-800 p-4 rounded border border-slate-700">
          <div className="text-sm text-slate-400">Budget Limit</div>
          <div className="text-2xl font-mono text-yellow-400">$10.00</div>
        </div>
      </div>
    </div>
  );
};
