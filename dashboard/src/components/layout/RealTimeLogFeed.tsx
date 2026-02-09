import React, { useEffect, useState, useRef } from 'react';
import { useHiveStore } from '../../store/useHiveStore';

const RealTimeLogFeed = ({ jobId }: { jobId: string }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const socket = useHiveStore((s) => s.socket);

  useEffect(() => {
    if (!socket) return;

    const onLogRelay = (data: { type: string; message: string; timestamp: string }) => {
      setLogs(prev => [...prev.slice(-100), `[${data.timestamp}] [${data.type.toUpperCase()}] ${data.message}`]);
    };

    socket.on('LOG_RELAY', onLogRelay);

    return () => {
      socket.off('LOG_RELAY', onLogRelay);
    };
  }, [socket, jobId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={containerRef} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-[10px] h-64 overflow-y-auto">
      <div className="text-zinc-500 mb-2 uppercase font-black tracking-widest border-b border-zinc-800 pb-2">
        Live Log Stream: {jobId}
      </div>
      {logs.length === 0 ? (
        <div className="text-zinc-600 italic py-8 text-center">No log events yet. Logs will appear when agent activity starts.</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="text-emerald-500 py-0.5 border-l border-zinc-800 pl-2">
            {log}
          </div>
        ))
      )}
      <div className="animate-pulse text-blue-500 mt-1">_</div>
    </div>
  );
};

export default RealTimeLogFeed;
