import React, { useState, useEffect } from 'react';

/**
 * QueenBeeLogo - The central orchestrator trigger.
 * Visual: Royal Bee icon + Title.
 * Interaction: Morphs into the command bar on hover.
 */
const QueenBeeTrigger = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [command, setCommand] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to trigger the Queen Bee
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsHovered(true);
      }
      // ESC to close
      if (e.key === 'Escape') {
        setIsHovered(false);
        setCommand('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out
        ${isHovered ? 'w-[600px] top-12' : 'w-48'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !command && setIsHovered(false)}
    >
      <div className={`
        relative overflow-hidden flex items-center transition-all duration-500
        ${isHovered 
          ? 'bg-white shadow-2xl rounded-2xl p-4 border border-blue-50' 
          : 'bg-slate-900 border border-slate-700 rounded-full py-2 px-4 shadow-lg cursor-pointer'}
      `}>
        
        {/* Queen Bee Logo (Royal Bee Icon) */}
        <div className={`flex items-center gap-3 transition-all duration-500 ${isHovered ? 'opacity-20 scale-75 blur-[1px]' : 'opacity-100'}`}>
          <div className="text-2xl animate-pulse">👑🐝</div>
          <span className="font-black text-xs uppercase tracking-[0.2em] text-white">Queen Bee</span>
        </div>

        {/* Morphing Input Field */}
        <div className={`absolute inset-0 flex items-center px-6 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping mr-4" />
          <input 
            type="text"
            placeholder="Search or command the Hive..."
            className="bg-transparent border-none outline-none w-full font-bold text-slate-900 text-sm placeholder:text-slate-300"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            autoFocus={isHovered}
          />
          <div className="text-[9px] bg-slate-100 text-slate-400 px-2 py-1 rounded font-mono font-bold">ESC</div>
        </div>
      </div>
    </div>
  );
};

export default QueenBeeTrigger;
