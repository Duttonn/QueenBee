import React, { useEffect, useState } from 'react';

const RealTimeLogFeed = ({ jobId }: { jobId: string }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Logic to connect to /api/logs/stream via socket.io-client
    console.log(`[UI] Connecting to stream for ${jobId}`);
    
    // Mocking real-time arrival
    const timer = setInterval(() => {
      setLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${jobId} activity detected...`]);
    }, 3000);

    return () => clearInterval(timer);
  }, [jobId]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[10px] h-64 overflow-y-auto">
      <div className="text-slate-500 mb-2 uppercase font-black tracking-widest border-b border-slate-800 pb-2">
        Live Log Stream: {jobId}
      </div>
      {logs.map((log, i) => (
        <div key={i} className="text-[#22C55E] py-0.5 border-l border-slate-800 pl-2">
          {log}
        </div>
      ))}
      <div className="animate-pulse text-[#3B82F6] mt-1">_</div>
    </div>
  );
};

export default RealTimeLogFeed;
