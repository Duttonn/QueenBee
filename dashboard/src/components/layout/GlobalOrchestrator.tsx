import React, { useEffect, useState } from 'react';

// Mock of the Global State
const useCodexStore = () => {
  const [projects, setProjects] = useState([
    { id: 'bj', name: 'Blackjack Advisor', agents: ['Generator'] }
  ]);

  const addProject = (name: string) => {
    setProjects(prev => [...prev, { id: Date.now().toString(), name, agents: [] }]);
  };

  return { projects, addProject };
};

const GlobalOrchestratorOverlay = () => {
  const { projects, addProject } = useCodexStore();
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  // simulate receiving a command from the server-side Orchestrator
  useEffect(() => {
    const handleServerCommand = (event: MessageEvent) => {
      const { action, params } = JSON.parse(event.data);
      if (action === 'UI_CREATE_PROJECT') {
        addProject(params.name);
        setLastCommand(`Action: Created project "${params.name}"`);
      }
    };
    
    // In production, this would be a real WebSocket/EventSource
    // window.codexSocket.on('command', handleServerCommand);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-[#1E293B] border border-blue-500 rounded-lg shadow-2xl p-4 text-white z-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="font-bold text-sm uppercase">Global Orchestrator</span>
      </div>
      <div className="text-xs text-slate-400 mb-3">
        {lastCommand || "Monitoring UI events..."}
      </div>
      <div className="bg-[#0F172A] rounded p-2 text-xs border border-slate-700">
        <span className="text-[#22C55E]">fitch@codex:~$</span> Waiting for command...
      </div>
    </div>
  );
};

export default GlobalOrchestratorOverlay;
