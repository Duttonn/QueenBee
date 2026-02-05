import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowUpFromLine,
  Loader2,
  Settings
} from 'lucide-react';
import Sidebar from './Sidebar';
import AutomationDashboard from './AutomationDashboard';
import SkillsManager from './SkillsManager';
import AgenticWorkbench from './AgenticWorkbench';
import { sendChatMessage, getGitDiff, type Message } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import CustomizationPanel from '../settings/CustomizationPanel';

// Cloud Terminal Icon Component (matches ☁️_ from spec)
const CloudTerminalIcon = () => (
  <div className="relative inline-flex items-center justify-center mb-6">
    <Cloud size={48} strokeWidth={1.5} className="text-gray-900" />
    <span className="absolute -bottom-1 -right-2 text-lg font-mono font-bold text-gray-900">_</span>
  </div>
);

// Top Toolbar Component (Run, Open, Commit, Terminal, Diff, Screenshot)
interface TopToolbarProps {
  onOpenSettings: () => void;
  onRun?: () => void;
  onCommit?: () => void;
  onOpen?: () => void;
  onToggleTerminal?: () => void;
}

const TopToolbar = ({ onOpenSettings, onRun, onCommit, onOpen, onToggleTerminal }: TopToolbarProps) => (
  <div className="flex items-center justify-end gap-2 p-3 flex-shrink-0">
    {/* Run Button */}
    <button
      onClick={onRun}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
    >
      <Play size={14} className="text-gray-500" />
      <ChevronDown size={12} className="text-gray-400" />
    </button>

    {/* Open Button */}
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
    >
      <FolderOpen size={14} className="text-gray-500" />
      <span>Open</span>
    </button>

    {/* Commit Button */}
    <button
      onClick={onCommit}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium text-white shadow-sm"
    >
      <GitCommit size={14} />
      <span>Commit</span>
    </button>

    <div className="w-px h-6 bg-gray-200 mx-1"></div>

    {/* Terminal Toggle */}
    <button
      onClick={onToggleTerminal}
      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <TerminalSquare size={18} />
    </button>

    {/* Settings Button - Added */}
    <button
      onClick={onOpenSettings}
      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      title="Customize Queen Bee"
    >
      <Settings size={18} />
    </button>
  </div>
);

// Empty State Component - Fixed to fill available space
interface EmptyStateProps {
  onOpenSettings: () => void;
  onRun?: () => void;
  onCommit?: () => void;
  onOpen?: () => void;
  onToggleTerminal?: () => void;
}

const EmptyState = ({ onOpenSettings, onRun, onCommit, onOpen, onToggleTerminal }: EmptyStateProps) => (
  <div className="flex-1 flex flex-col min-h-0 bg-white relative">
    {/* Top Toolbar */}
    <TopToolbar
      onOpenSettings={onOpenSettings}
      onRun={onRun}
      onCommit={onCommit}
      onOpen={onOpen}
      onToggleTerminal={onToggleTerminal}
    />

    {/* Centered Content - takes remaining space */}
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="text-center px-4">
        <CloudTerminalIcon />
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">Let's build</h1>
        <button onClick={onOpen} className="inline-flex items-center gap-2 text-base sm:text-lg text-slate-400 hover:text-slate-600 transition-colors">
          <span>AstroScope</span>
          <ChevronDown size={18} />
        </button>
      </div>
    </div>

    {/* Spacer for composer bar */}
    <div className="h-24 flex-shrink-0"></div>
  </div>
);

// Bottom Composer Bar - Responsive with props
interface ComposerBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
  availableModels: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

const ComposerBar = ({ value, onChange, onSubmit, isLoading, mode, onModeChange, availableModels, selectedModel, onModelSelect }: ComposerBarProps) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim() && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl sm:px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
        {/* Left Controls */}
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
          <Plus size={18} />
        </button>

        {/* Mode Selector - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          {(['local', 'worktree', 'cloud'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === m
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Model Selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-transparent hover:border-gray-300"
          >
            <span>{selectedModel || 'Select Model'}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          <AnimatePresence>
            {isModelMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-20 p-1"
                >
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Select Model
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {availableModels.length > 0 ? (
                      availableModels.map((m) => (
                        <button
                          key={m}
                          onClick={() => { onModelSelect(m); setIsModelMenuOpen(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${m === selectedModel
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {m}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-xs text-gray-400">No models available</div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Codex anything..."
          disabled={isLoading}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-gray-400 outline-none disabled:opacity-50"
        />

        {/* Right Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <Lock size={16} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <Mic size={16} />
          </button>
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
            className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  // Auth state
  const { providers, activeProviderId, user } = useAuthStore();
  const activeProvider = providers.find(p => p.id === activeProviderId) || providers.find(p => p.connected);

  // App state
  const { runAutomation, commit, projects, fetchData, addProject } = useAppStore();

  useEffect(() => {
    fetchData();
  }, []);

  // Sync selected model
  const availableModels = activeProvider?.models || [];
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  const handleRun = async () => {
    const cmd = prompt('Enter command to run:', 'echo "Hello World"');
    if (cmd) {
      try {
        const res = await runAutomation(cmd);
        alert(`Execution Result:\n\nStdout:\n${res.stdout}\n\nStderr:\n${res.stderr}`);
      } catch (e: any) {
        alert('Execution failed: ' + e.message);
      }
    }
  };

  const handleCommit = async () => {
    const msg = prompt('Enter commit message:', 'Update from Queen Bee');
    if (msg) {
      try {
        // Default to current directory or first project
        const path = projects.length > 0 ? projects[0].path : '/Users/ndn18/PersonalProjects/QueenBee';
        await commit(path, msg);
        alert('Changes committed successfully!');
      } catch (e: any) {
        alert('Commit failed: ' + e.message);
      }
    }
  };

  const handleOpen = async () => {
    const path = prompt('Enter absolute path to project folder:', '/Users/ndn18/PersonalProjects/');
    if (path) {
      const name = path.split('/').pop() || 'Untitled';
      try {
        await addProject(name, path);
        alert(`Project "${name}" added successfully!`);
      } catch (e: any) {
        alert('Failed to add project. Ensure backend is running and path exists.');
      }
    }
  };

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executionMode, setExecutionMode] = useState<'local' | 'worktree' | 'cloud'>('worktree');
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });

  // Send message to backend using active provider
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Determine which provider to use
    const providerToUse = activeProvider?.id || 'mock';
    const modelToUse = selectedModel || activeProvider?.models?.[0] || 'mock-model';
    const apiKey = activeProvider?.apiKey;

    try {
      const response = await sendChatMessage({
        model: modelToUse,
        messages: [...messages, userMessage],
        provider: providerToUse as any,
        apiKey: apiKey,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices?.[0]?.message?.content || 'No response received',
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update diff stats after action
      try {
        const diff = await getGitDiff('/Users/ndn18/PersonalProjects/QueenBee');
        setDiffStats({ added: diff.added, removed: diff.removed });
      } catch {
        // Ignore diff errors
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, isLoading]);

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
              <Sidebar
                activeView={activeView}
                onOpenSettings={() => setIsCustomizationOpen(true)}
                onViewChange={(view) => {
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
              {messages.length > 0 ? (
                <AgenticWorkbench
                  messages={messages}
                  isLoading={isLoading}
                  diffStats={diffStats}
                  changedFiles={[]}
                  mode={executionMode}
                  onModeChange={setExecutionMode}
                />
              ) : (
                <EmptyState
                  onOpenSettings={() => setIsCustomizationOpen(true)}
                  onRun={handleRun}
                  onCommit={handleCommit}
                  onOpen={handleOpen}
                  onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
                />
              )}
              <ComposerBar
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSendMessage}
                isLoading={isLoading}
                mode={executionMode}
                onModeChange={setExecutionMode}
                availableModels={availableModels}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
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

      {/* Customization Panel */}
      <CustomizationPanel
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
      />

    </div>
  );
};

export default CodexLayout;
