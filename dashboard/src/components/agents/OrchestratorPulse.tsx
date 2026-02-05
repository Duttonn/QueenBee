import React from 'react';

const OrchestratorPulse = () => {
  const activeSteps = [
    { id: 1, label: 'Analyze visionOS-MCP', status: 'complete' },
    { id: 2, label: 'Draft Prompt for Projection-Fixer', status: 'active' },
    { id: 3, label: 'Create WorkTree: fix/projection-matrix', status: 'pending' },
    { id: 4, label: 'Spawn Agent: Kimi-K2.5', status: 'pending' },
  ];

  return (
    <div className="flex flex-col gap-4 p-6 bg-[#0F172A] rounded-xl border border-slate-700 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h3 className="text-lg font-mono text-[#3B82F6]">⚡ Execution Pipeline</h3>
        <span className="text-xs bg-[#3B82F6]/20 text-[#3B82F6] px-2 py-1 rounded">PROMPT_DRAFTING</span>
      </div>

      <div className="space-y-6 relative">
        {activeSteps.map((step, idx) => (
          <div key={step.id} className="flex items-start gap-4 relative z-10">
            <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${
              step.status === 'complete' ? 'bg-green-500 shadow-[0_0_10px_#22C55E]' : 
              step.status === 'active' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'
            }`} />
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                {step.label}
              </span>
              {step.status === 'active' && (
                <div className="mt-2 bg-[#1E293B] p-3 rounded-md text-xs text-slate-400 border-l-2 border-blue-500">
                  <span className="text-[#3B82F6] font-bold">DRAFTING:</span> "You are a visionOS expert. Refactor projection.js to use SIMD math for improved performance..."
                  <div className="mt-2 flex gap-2">
                    <button className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">Tweak Prompt</button>
                    <button className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">See Context (4 files)</button>
                  </div>
                </div>
              )}
            </div>
            {idx < activeSteps.length - 1 && (
              <div className="absolute left-[5px] top-4 w-[2px] h-8 bg-[#1E293B]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrchestratorPulse;
