import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_RESTRICTED = [
  'rm -rf', 'sudo', 'shutdown', 'reboot', 'mkfs', ':(){:|:&};:',
  'dd', 'wget', 'curl', 'chmod', 'chown', 'top', 'htop', 'kill',
  'pkill', 'killall', 'telnet', 'ssh', 'ftp', 'nc', 'netcat',
  'nmap', 'ping', 'traceroute', 'nslookup', 'dig', 'whois',
  'iptables', 'ufw', 'firewall-cmd', 'npm publish', 'pip install',
  'docker', 'kubectl', 'terraform', 'helm', 'aws', 'gcloud', 'az'
];

interface RestrictedCommandsProps {
  onSave: (commands: string[]) => void;
  currentCommands?: string[];
}

const RestrictedCommands = ({ onSave, currentCommands = DEFAULT_RESTRICTED }: RestrictedCommandsProps) => {
  const [commands, setCommands] = useState<string[]>(currentCommands);
  const [newValue, setNewValue] = useState('');

  // Persist locally for demo purposes if no prop provided
  useEffect(() => {
    const stored = localStorage.getItem('restricted_commands');
    if (stored) {
      setCommands(JSON.parse(stored));
    }
  }, []);

  const handleAdd = () => {
    if (newValue && !commands.includes(newValue)) {
      const newCommands = [...commands, newValue];
      setCommands(newCommands);
      localStorage.setItem('restricted_commands', JSON.stringify(newCommands));
      onSave(newCommands);
      setNewValue('');
    }
  };

  const handleRemove = (cmd: string) => {
    const newCommands = commands.filter(c => c !== cmd);
    setCommands(newCommands);
    localStorage.setItem('restricted_commands', JSON.stringify(newCommands));
    onSave(newCommands);
  };

  const handleReset = () => {
    setCommands(DEFAULT_RESTRICTED);
    localStorage.setItem('restricted_commands', JSON.stringify(DEFAULT_RESTRICTED));
    onSave(DEFAULT_RESTRICTED);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertTriangle size={18} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Security Restrictions</h3>
          <p className="text-xs text-amber-700/80 leading-relaxed">
            These commands are restricted by default. If the agent attempts to run any of these, 
            it will require your explicit confirmation before proceeding.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Add Restricted Command</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. npm install"
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900/20 transition-all"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Restrictions ({commands.length})</label>
          <button 
            onClick={handleReset}
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-100 rounded-lg transition-all"
          >
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {commands.map(cmd => (
                <motion.div
                  key={cmd}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg shadow-sm group hover:border-red-200 transition-colors"
                >
                  <span className="text-xs font-medium text-zinc-700 font-mono">{cmd}</span>
                  <button
                    onClick={() => handleRemove(cmd)}
                    className="p-0.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-md transition-colors"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestrictedCommands;
