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
import XtermTerminal from './XtermTerminal';
import GlobalCommandBar from './GlobalCommandBar';
import { sendChatMessage, sendChatMessageStream, getGitDiff, type Message } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useHiveStore } from '../../store/useHiveStore';
import CustomizationPanel from '../settings/CustomizationPanel';
import { NativeService } from '../../services/NativeService';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';

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

  // Voice Recording Hook
  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecording(
    useCallback((transcript) => {
      onChange(value ? `${value} ${transcript}` : transcript);
    }, [value, onChange])
  );

  // Ctrl+M Shortcut for Composer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim() && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-3xl sm:px-4">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col">
        {/* Top: Input Area */}
        <div className="px-4 pt-4 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Codex anything, @ to add files, / for commands..."
            disabled={isLoading}
            rows={1}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-gray-400 outline-none resize-none min-h-[44px] max-h-40 leading-relaxed"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Bottom: Controls Row */}
        <div className="px-3 pb-3 pt-1 flex items-center justify-between bg-zinc-50/30 border-t border-gray-100/50 rounded-b-3xl">
          <div className="flex items-center gap-2">
            {/* Plus button */}
            <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
              <Plus size={18} strokeWidth={1.5} />
            </button>

            <div className="w-px h-4 bg-gray-200 mx-1"></div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 flex-shrink-0">
              {(() => {
                const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
                const modes = isElectron 
                  ? (['local', 'worktree', 'cloud'] as const)
                  : (['cloud'] as const);
                
                return modes.map((m) => (
                  <button
                    key={m}
                    onClick={() => onModeChange(m)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === m
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                  >
                    {m}
                  </button>
                ));
              })()}
            </div>

            {/* Model Selector */}
            <div className="relative flex-shrink-0 ml-1">
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-colors border border-transparent"
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
                      className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden z-20 p-1 backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] border-b border-gray-50 mb-1">
                        AI Model
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {availableModels.length > 0 ? (
                          availableModels.map((m) => (
                            <button
                              key={m}
                              onClick={() => { onModelSelect(m); setIsModelMenuOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${m === selectedModel
                                ? 'bg-[#0F172A] text-white shadow-lg'
                                : 'text-zinc-600 hover:bg-zinc-50'
                                }`}
                            >
                              {m}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-zinc-400 italic">No models available</div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side: Voice and Send */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : isTranscribing ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
              disabled={isTranscribing}
            >
              {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} strokeWidth={1.5} />}
            </button>
            <button
              onClick={onSubmit}
              disabled={!value.trim() || isLoading}
              className={`p-2 rounded-xl transition-all shadow-md ${!value.trim() || isLoading
                ? 'bg-gray-100 text-gray-300'
                : 'bg-[#0F172A] text-white hover:bg-[#1E293B] scale-105 active:scale-95'
                }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Command Palette / Search Modal
const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeView, setActiveView] = useState<'build' | 'automations' | 'skills'>('build');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  // Auth state
  const { providers, activeProviderId, user } = useAuthStore();
  const activeProvider = providers.find(p => p.id === activeProviderId) || providers.find(p => p.connected);

  // App state
  const { runAutomation, commit, fetchData, addProject: addAppProject } = useAppStore();

  // Hive state
  const { projects, addProject, activeThreadId, setActiveThread, addThread, addMessage, updateThread, updateLastMessage } = useHiveStore();
  const activeProject = projects.find(p => p.id === selectedProjectId);
  
  // Swarm Workflow Handler
  useEffect(() => {
    const handleStartSwarm = async (e: any) => {
      if (!selectedProjectId) return;
      const { name } = e.detail;
      const threadId = `swarm-${Date.now()}`;
      
      await addThread(selectedProjectId, {
        id: threadId,
        title: `Swarm: ${name}`,
        diff: '+0 -0',
        time: 'Just now',
        agentId: 'orchestrator-bee' // Crucial for backend role detection
      });
      
      setActiveThread(threadId);
      setActiveView('build');
      
      // Auto-trigger the orchestrator's first move
      setTimeout(() => {
        setInputValue(`I want to implement the following feature: ${name}. Please create a plan in TASKS.md and start spawning workers.`);
      }, 500);
    };

    window.addEventListener('START_SWARM_WORKFLOW', handleStartSwarm);
    return () => window.removeEventListener('START_SWARM_WORKFLOW', handleStartSwarm);
  }, [selectedProjectId, addThread, setActiveThread]);

  const activeThread = activeProject?.threads?.find((t: any) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  useEffect(() => {
    fetchData();
  }, []);

  // Sync selected model
  const availableModels = activeProvider?.models || [];
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (availableModels.length > 0) {
      // If current selected model is not in the new available models list, reset it to the first available
      if (!selectedModel || !availableModels.includes(selectedModel)) {
        setSelectedModel(availableModels[0]);
      }
    } else {
      setSelectedModel('');
    }
  }, [availableModels, selectedModel]);

  const handleRun = async () => {
    // We could implement a custom modal for input instead of prompt
    const cmd = prompt('Enter command to run:', 'echo "Hello World"');
    if (cmd) {
      try {
        const res = await runAutomation(cmd);
        NativeService.dialog.showMessage({
          type: 'info',
          title: 'Execution Result',
          message: 'Command executed successfully',
          detail: `Stdout:\n${res.stdout}\n\nStderr:\n${res.stderr}`
        });
      } catch (e: any) {
        NativeService.dialog.showMessage({
          type: 'error',
          message: 'Execution failed',
          detail: e.message
        });
      }
    }
  };

  const handleCommit = async () => {
    const msg = prompt('Enter commit message:', 'Update from Queen Bee');
    if (msg) {
      try {
        // Default to current directory or first project
        const path = activeProject?.path || '.';
        await commit(path, msg);
        NativeService.notify('Commit Successful', `Committed changes to ${path}`);
      } catch (e: any) {
        NativeService.dialog.showMessage({
          type: 'error',
          message: 'Commit failed',
          detail: e.message
        });
      }
    }
  };

  const handleOpen = async () => {
    const result = await NativeService.dialog.showOpen({
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0];
      const name = path.split('/').pop() || 'Untitled';
      try {
        await addAppProject(name, path);
        // Success notification
        NativeService.notify('Project Added', `Successfully added ${name}`);
      } catch (e: any) {
        NativeService.dialog.showMessage({
          type: 'error',
          message: 'Failed to add project',
          detail: e.message
        });
      }
    }
  };

  // Chat state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executionMode, setExecutionMode] = useState<'local' | 'worktree' | 'cloud'>(
    (typeof window !== 'undefined' && (window as any).electron) ? 'worktree' : 'cloud'
  );
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });

  // Send message to backend using active provider
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !selectedProjectId) return;

    let currentThreadId = activeThreadId;
    
    // Create thread if none exists
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      const title = inputValue.length > 30 ? inputValue.substring(0, 30) + '...' : inputValue;
      await addThread(selectedProjectId, {
        id: currentThreadId,
        title: title,
        diff: '+0 -0',
        time: 'Just now'
      });
    }

    const userMessage: Message = { role: 'user', content: inputValue };
    addMessage(selectedProjectId, currentThreadId, userMessage);
    
    setInputValue('');
    setIsLoading(true);

    // Add empty assistant message for streaming
    addMessage(selectedProjectId, currentThreadId, { role: 'assistant', content: '' });

    // Determine which provider to use
    const providerToUse = activeProvider?.id || 'mock';
    const modelToUse = selectedModel || activeProvider?.models?.[0] || 'mock-model';
    const apiKey = activeProvider?.apiKey;
    
    // Find active thread to get its agentId
    const activeThread = activeProject?.threads?.find((t: any) => t.id === currentThreadId);
    const agentId = activeThread?.agentId;

    try {
      await sendChatMessageStream(
        {
          model: modelToUse,
          messages: [...messages, userMessage],
          provider: providerToUse as any,
          apiKey: apiKey,
          projectPath: activeProject?.path, // Pass the path for context injection
          threadId: currentThreadId,
          mode: executionMode,
          agentId: agentId
        } as any,
        (chunk) => {
          updateLastMessage(selectedProjectId, currentThreadId!, chunk);
        },
        async (fullText) => {
          setIsLoading(false);
          // Update diff stats after action
          try {
            const diff = await getGitDiff(activeProject?.path || '../');
            setDiffStats({ added: diff.added, removed: diff.removed });
            
            updateThread(selectedProjectId, currentThreadId!, {
              diff: `+${diff.added} -${diff.removed}`,
              time: 'Just now'
            });
          } catch {
            // Ignore diff errors
          }
        },
        (error) => {
          console.error('Chat error:', error);
          updateLastMessage(selectedProjectId, currentThreadId!, `\n\nError: ${error.message}`);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  }, [inputValue, messages, isLoading, selectedProjectId, activeThreadId, activeProvider, selectedModel, addThread, addMessage, updateThread, updateLastMessage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+J: Toggle Terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
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
                onSearchClick={() => {}} // GlobalCommandBar handles Cmd+K
                selectedProjectId={selectedProjectId}
                onProjectSelect={(id) => {
                  setSelectedProjectId(id);
                  setActiveView('build');
                }}
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
              {(messages.length > 0 || activeProject) ? (
                <AgenticWorkbench
                  messages={messages}
                  isLoading={isLoading}
                  diffStats={diffStats}
                  changedFiles={[]}
                  mode={executionMode}
                  onModeChange={setExecutionMode}
                  activeProject={activeProject}
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
            <div className="absolute bottom-0 left-0 right-0 h-72 z-50">
              <XtermTerminal />
              <button 
                onClick={() => setIsTerminalOpen(false)}
                className="absolute top-2 right-4 text-slate-500 hover:text-white z-[60]"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Command Bar (Cmd+K) */}
      <GlobalCommandBar />

      {/* Customization Panel */}
      <CustomizationPanel
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
      />

    </div>
  );
};

export default CodexLayout;
