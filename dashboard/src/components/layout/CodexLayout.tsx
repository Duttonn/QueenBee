import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  X,
  ChevronDown,
  Camera,
  Plus,
  Lock,
  Mic,
  ArrowUp,
  Menu,
  Cloud,
  Search,
  PenSquare,
  Clock,
  Play,
  GitCommit,
  FolderOpen,
  TerminalSquare,
  Copy,
  ArrowUpFromLine
} from 'lucide-react';
import Sidebar from './Sidebar';
import AutomationDashboard from './AutomationDashboard';
import SkillsManager from './SkillsManager';

// Cloud Terminal Icon Component (matches ☁️_ from spec)
const CloudTerminalIcon = () => (
  <div className="relative inline-flex items-center justify-center mb-6">
    <Cloud size={48} strokeWidth={1.5} className="text-gray-900" />
    <span className="absolute -bottom-1 -right-2 text-lg font-mono font-bold text-gray-900">_</span>
  </div>
);

// Top Toolbar Component (Run, Open, Commit, Terminal, Diff, Screenshot)
const TopToolbar = () => (
  <div className="flex items-center justify-end gap-2 p-3 flex-shrink-0">
    {/* Run Button */}
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
      <Play size={14} className="text-gray-500" />
      <ChevronDown size={12} className="text-gray-400" />
    </button>

    {/* Open Button */}
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
      <FolderOpen size={14} className="text-blue-500" />
      <span>Open</span>
      <ChevronDown size={12} className="text-gray-400" />
    </button>

    {/* Commit Button */}
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
      <GitCommit size={14} className="text-gray-500" />
      <span>Commit</span>
      <ChevronDown size={12} className="text-gray-400" />
    </button>

    {/* Separator */}
    <div className="w-px h-5 bg-gray-200 mx-1" />

    {/* Terminal Button */}
    <button className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      <TerminalSquare size={16} className="text-gray-500" />
    </button>

    {/* Diff Stats */}
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium">
      <ArrowUpFromLine size={14} className="text-gray-500" />
      <span className="text-green-600">+28</span>
      <span className="text-red-500">-5</span>
    </button>

    {/* Screenshot Button */}
    <button className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      <Copy size={16} className="text-gray-500" />
    </button>
  </div>
);

// Empty State Component - Fixed to fill available space
const EmptyState = () => (
  <div className="flex-1 flex flex-col min-h-0 bg-white relative">
    {/* Top Toolbar */}
    <TopToolbar />

    {/* Centered Content - takes remaining space */}
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="text-center px-4">
        <CloudTerminalIcon />
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">Let's build</h1>
        <button className="inline-flex items-center gap-2 text-base sm:text-lg text-slate-400 hover:text-slate-600 transition-colors">
          <span>AstroScope</span>
          <ChevronDown size={18} />
        </button>
      </div>
    </div>

    {/* Spacer for composer bar */}
    <div className="h-24 flex-shrink-0"></div>
  </div>
);

// Bottom Composer Bar - Responsive
const ComposerBar = () => (
  <div className="absolute bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl sm:px-4">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
      {/* Left Controls */}
      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
        <Plus size={18} />
      </button>

      {/* Mode Selector - Hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
        <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-md transition-colors">
          Local
        </button>
        <button className="px-3 py-1.5 text-xs font-medium bg-white text-gray-900 rounded-md shadow-sm">
          Worktree
        </button>
        <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-md transition-colors">
          Cloud
        </button>
      </div>

      {/* Input */}
      <input
        type="text"
        placeholder="Ask Codex anything..."
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-gray-400 outline-none"
      />

      {/* Right Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
          <Lock size={16} />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
          <Mic size={16} />
        </button>
        <button className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white transition-colors">
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  </div>
);

// Terminal Drawer (Light Mode)
const TerminalDrawer = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    className="absolute bottom-0 left-0 right-0 h-64 sm:h-72 bg-white border-t border-gray-200 shadow-2xl z-50 flex flex-col"
  >
    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 flex-shrink-0">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Terminal size={14} />
        <span>TERMINAL - Local</span>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
        <X size={14} />
      </button>
    </div>
    <div className="flex-1 p-4 font-mono text-xs sm:text-sm text-slate-700 bg-slate-50 overflow-auto">
      <div><span className="text-green-600">➜</span> <span className="text-blue-600">~/projects/astroscope</span> git status</div>
      <div className="text-slate-500">On branch main</div>
      <div className="text-slate-500">Your branch is up to date with 'origin/main'.</div>
      <div className="mt-2"><span className="text-green-600">➜</span> <span className="text-blue-600">~/projects/astroscope</span> <span className="animate-pulse">_</span></div>
    </div>
  </motion.div>
);

// Command Palette / Search Modal
const CommandPalette = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <Search size={18} className="text-gray-400" />
        <input
          autoFocus
          type="text"
          placeholder="Search threads, commands, or anything..."
          className="flex-1 bg-transparent text-base text-slate-800 placeholder-gray-400 outline-none"
        />
        <kbd className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded">esc</kbd>
      </div>

      {/* Quick Actions */}
      <div className="p-2 max-h-80 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Quick Actions</div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <PenSquare size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">New Thread</div>
            <div className="text-xs text-gray-500">Start a new conversation</div>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Terminal size={16} className="text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Open Terminal</div>
            <div className="text-xs text-gray-500">⌘J to toggle</div>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Clock size={16} className="text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Automations</div>
            <div className="text-xs text-gray-500">Manage scheduled tasks</div>
          </div>
        </button>
      </div>
    </motion.div>
  </motion.div>
);
const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeView, setActiveView] = useState<'build' | 'automations' | 'skills'>('build');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+J: Toggle Terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
      // Cmd+K: Toggle Search/Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      // Escape: Close modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden font-sans selection:bg-blue-100">

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-xl shadow-sm"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Sidebar - Responsive */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/20 z-30"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed md:relative z-40 h-full"
            >
              <Sidebar activeView={activeView} onViewChange={(view) => {
                setActiveView(view);
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area - Always fills remaining space with white bg */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-white">

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {activeView === 'automations' ? (
            <AutomationDashboard />
          ) : activeView === 'build' ? (
            <>
              <EmptyState />
              <ComposerBar />
            </>
          ) : (
            <SkillsManager />
          )}
        </div>

        {/* Terminal Drawer */}
        <AnimatePresence>
          {isTerminalOpen && (
            <TerminalDrawer onClose={() => setIsTerminalOpen(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* Command Palette (Cmd+K) */}
      <AnimatePresence>
        {isSearchOpen && (
          <CommandPalette onClose={() => setIsSearchOpen(false)} />
        )}
      </AnimatePresence>

    </div>
  );
};

export default CodexLayout;
