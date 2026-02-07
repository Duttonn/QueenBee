import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
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
  Settings,
  Eye,
  Inbox,
  Layers
} from 'lucide-react';
import Sidebar from './Sidebar';
import AutomationDashboard from './AutomationDashboard';
import SkillsManager from './SkillsManager';
import AgenticWorkbench from './AgenticWorkbench';
import InboxPanel from './InboxPanel';
import InspectorPanel from './InspectorPanel';
import XtermTerminal from './XtermTerminal';
import GlobalCommandBar from './GlobalCommandBar';
import DictationOverlay from './DictationOverlay';
import { sendChatMessage, sendChatMessageStream, getGitDiff, type Message } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useHiveStore } from '../../store/useHiveStore';
import CustomizationPanel from '../settings/CustomizationPanel';
import DiffViewer from '../projects/DiffViewer';
import { NativeService } from '../../services/NativeService';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';

// Cloud Terminal Icon Component
const CloudTerminalIcon = () => (
  <div className="relative inline-flex items-center justify-center mb-6">
    <Cloud size={48} strokeWidth={1.5} className="text-zinc-900" />
    <span className="absolute -bottom-1 -right-2 text-lg font-mono font-bold text-zinc-900">_</span>
  </div>
);

// Top Toolbar Component
interface TopToolbarProps {
  onOpenSettings: () => void;
  onRun?: () => void;
  onCommit?: () => void;
  onOpen?: () => void;
  onToggleTerminal?: () => void;
  onToggleInspector?: () => void;
}

const TopToolbar = ({ onOpenSettings, onRun, onCommit, onOpen, onToggleTerminal, onToggleInspector }: TopToolbarProps) => (
  <div className="flex items-center justify-end gap-2 p-3 flex-shrink-0">
    <button
      onClick={onRun}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-sm font-medium text-zinc-700"
    >
      <Play size={14} className="text-zinc-500" />
      <ChevronDown size={12} className="text-zinc-400" />
    </button>

    <button
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-sm font-medium text-zinc-700"
    >
      <FolderOpen size={14} className="text-zinc-500" />
      <span>Open</span>
    </button>

    <button
      onClick={onCommit}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium text-white shadow-sm"
    >
      <GitCommit size={14} />
      <span>Commit</span>
    </button>

    <div className="w-px h-6 bg-zinc-200 mx-1"></div>

    <button
      onClick={onToggleInspector}
      className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      title="Deep Inspector"
    >
      <Layers size={18} />
    </button>

    <button
      onClick={onToggleTerminal}
      className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
    >
      <TerminalSquare size={18} />
    </button>

    <button
      onClick={onOpenSettings}
      className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
      title="Settings"
    >
      <Settings size={18} />
    </button>
  </div>
);

// Empty State Component
const EmptyState = ({ onOpenSettings, onRun, onCommit, onOpen, onToggleTerminal, onToggleInspector }: any) => (
  <div className="flex-1 flex flex-col min-h-0 bg-white relative">
    <TopToolbar
      onOpenSettings={onOpenSettings}
      onRun={onRun}
      onCommit={onCommit}
      onOpen={onOpen}
      onToggleTerminal={onToggleTerminal}
      onToggleInspector={onToggleInspector}
    />

    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="text-center px-4">
        <CloudTerminalIcon />
        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-900 mb-2">Let's build</h1>
        <button onClick={onOpen} className="inline-flex items-center gap-2 text-base sm:text-lg text-zinc-400 hover:text-zinc-600 transition-colors">
          <span>Select Project</span>
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
    <div className="h-24 flex-shrink-0"></div>
  </div>
);

// Composer Bar Component
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
  const [showPreview, setShowPreview] = useState(false);

  const { isRecording, isProcessing, toggleRecording } = useVoiceRecording(
    useCallback((transcript) => {
      onChange(value ? `${value} ${transcript}` : transcript);
    }, [value, onChange])
  );

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
    <div className="absolute bottom-6 left-4 right-4 sm:left-0 sm:right-0 sm:mx-auto sm:w-full sm:max-w-3xl sm:px-4 z-50">
      <DictationOverlay
        isVisible={isRecording}
        isProcessing={isProcessing}
        onClose={toggleRecording}
      />

      <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top: Input Area */}
        <div className="px-4 pt-4 pb-2">
          {showPreview ? (
            <div className="w-full bg-transparent text-sm text-zinc-900 min-h-[44px] max-h-40 overflow-y-auto prose prose-sm prose-zinc">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {value || '*Preview mode empty*'}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Queen Bee anything, @ to add files, / for commands..."
              disabled={isLoading}
              rows={1}
              className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none resize-none min-h-[44px] max-h-40 leading-relaxed"
              style={{ height: 'auto' }}
            />
          )}
        </div>

        {/* Bottom: Controls Row */}
        <div className="px-3 pb-3 pt-1 flex items-center justify-between bg-zinc-50 border-t border-zinc-100 rounded-b-3xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-xl transition-all ${showPreview ? 'bg-blue-50 text-blue-600' : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'}`}
              title={showPreview ? "Back to Edit" : "Markdown Preview"}
            >
              <Eye size={18} strokeWidth={1.5} />
            </button>

            <div className="w-px h-4 bg-zinc-200 mx-1"></div>

            <button className="p-2 hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all">
              <Plus size={18} strokeWidth={1.5} />
            </button>

            <div className="w-px h-4 bg-zinc-200 mx-1"></div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {(['local', 'worktree', 'cloud'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === m
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all"
              >
                <span>{selectedModel || 'Select Model'}</span>
                <ChevronDown size={10} className="text-zinc-400" />
              </button>
              <AnimatePresence>
                {isModelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-20 p-1"
                    >
                      <div className="px-3 py-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 mb-1">
                        AI Model
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {availableModels.map((m) => (
                          <button
                            key={m}
                            onClick={() => { onModelSelect(m); setIsModelMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${m === selectedModel
                              ? 'bg-zinc-900 text-white shadow-lg'
                              : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-600' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Mic size={18} strokeWidth={1.5} />}
            </button>
            <button
              onClick={onSubmit}
              disabled={!value.trim() || isLoading}
              className={`p-2 rounded-xl transition-all shadow-lg ${!value.trim() || isLoading
                ? 'bg-zinc-100 text-zinc-300'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 scale-105 active:scale-95'
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

const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeView, setActiveView] = useState<'build' | 'automations' | 'skills' | 'inbox'>('build');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  const { providers, activeProviderId } = useAuthStore();
  const activeProvider = providers.find(p => p.id === activeProviderId) || providers.find(p => p.connected);
  const { runAutomation, commit, fetchData, addProject: addAppProject } = useAppStore();
  const { projects, activeThreadId, setActiveThread, addThread, addMessage, updateThread, updateLastMessage } = useHiveStore();
  const activeProject = projects.find(p => p.id === selectedProjectId);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executionMode, setExecutionMode] = useState<'local' | 'worktree' | 'cloud'>(
    (typeof window !== 'undefined' && (window as any).electron) ? 'worktree' : 'cloud'
  );
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });

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
        agentId: 'orchestrator-bee'
      });
      setActiveThread(threadId);
      setActiveView('build');
      setTimeout(() => setInputValue(`I want to implement the following feature: ${name}. Please create a plan in TASKS.md and start spawning workers.`), 500);
    };
    window.addEventListener('START_SWARM_WORKFLOW', handleStartSwarm);
    return () => window.removeEventListener('START_SWARM_WORKFLOW', handleStartSwarm);
  }, [selectedProjectId, addThread, setActiveThread]);

  const activeThread = activeProject?.threads?.find((t: any) => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableModels = activeProvider?.models || [];
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (availableModels.length > 0) {
      if (!selectedModel || !availableModels.includes(selectedModel)) {
        setSelectedModel(availableModels[0]);
      }
    } else {
      setSelectedModel('');
    }
  }, [availableModels, selectedModel]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !selectedProjectId) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      await addThread(selectedProjectId, {
        id: currentThreadId,
        title: inputValue.length > 30 ? inputValue.substring(0, 30) + '...' : inputValue,
        diff: '+0 -0',
        time: 'Just now'
      });
    }

    const userMessage: Message = { role: 'user', content: inputValue };
    addMessage(selectedProjectId, currentThreadId, userMessage);
    setInputValue('');
    setIsLoading(true);
    addMessage(selectedProjectId, currentThreadId, { role: 'assistant', content: '' });

    const providerToUse = activeProvider?.id || 'mock';
    const modelToUse = selectedModel || availableModels[0] || 'mock-model';
    const apiKey = activeProvider?.apiKey;
    const thread = activeProject?.threads?.find((t: any) => t.id === currentThreadId);
    const agentId = thread?.agentId;

    try {
      await sendChatMessageStream(
        {
          model: modelToUse,
          messages: [...messages, userMessage],
          provider: providerToUse as any,
          apiKey: apiKey,
          projectPath: activeProject?.path,
          threadId: currentThreadId,
          mode: executionMode,
          agentId: agentId
        } as any,
        (chunk) => updateLastMessage(selectedProjectId, currentThreadId!, chunk),
        async () => {
          setIsLoading(false);
          try {
            const diff = await getGitDiff(activeProject?.path || '../');
            setDiffStats({ added: diff.added, removed: diff.removed });
            updateThread(selectedProjectId, currentThreadId!, {
              diff: `+${diff.added} -${diff.removed}`,
              time: 'Just now'
            });
          } catch { }
        },
        (error) => {
          updateLastMessage(selectedProjectId, currentThreadId!, `\n\nError: ${error.message}`);
          setIsLoading(false);
        }
      );
    } catch (error) {
      setIsLoading(false);
    }
  }, [inputValue, messages, isLoading, selectedProjectId, activeThreadId, activeProvider, selectedModel, availableModels, activeProject?.path, executionMode, addThread, addMessage, updateLastMessage, updateThread]);

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
        NativeService.notify('Project Added', `Successfully added ${name}`);
      } catch (e: any) {
        NativeService.dialog.showMessage({ type: 'error', message: 'Failed to add project', detail: e.message });
      }
    }
  };

  const handleRun = () => alert('Run logic');
  const handleCommit = async () => {
    console.log('Commit action triggered');
    // TODO: Fetch diff here or let DiffViewer handle it
    setIsDiffOpen(true);
  };

  const handleClearThread = () => setActiveThread(null);
  const handleRunCommand = (cmd: string) => {
    console.log('Run command:', cmd);
    setIsTerminalOpen(true);
  };
  const handleRunProject = () => {
    console.log('Run project');
    setIsTerminalOpen(true);
  };

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 overflow-hidden font-sans selection:bg-blue-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-zinc-200 rounded-xl shadow-sm"
      >
        <Menu size={20} className="text-zinc-600" />
      </button>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/20 z-30"
              onClick={() => setIsSidebarOpen(false)}
            />
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
                onSearchClick={() => { }}
                selectedProjectId={selectedProjectId}
                onProjectSelect={(id) => {
                  setSelectedProjectId(id);
                  setActiveView('build');
                }}
                onViewChange={setActiveView}
                onAddProject={handleOpen}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-zinc-50/30">
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {activeView === 'automations' ? (
            <AutomationDashboard />
          ) : activeView === 'inbox' ? (
            <InboxPanel />
          ) : activeView === 'build' ? (
            <>
              {activeProject ? (
                <AgenticWorkbench
                  activeProject={activeProject}
                  messages={messages}
                  isLoading={isLoading}
                  onSendMessage={handleSendMessage}
                  onClearThread={handleClearThread}
                  onRunCommand={handleRunCommand}
                  activeThreadId={activeThreadId}
                  setActiveThread={setActiveThread}
                  onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
                  onRun={handleRunProject}
                  onCommit={handleCommit}
                  onBuild={() => handleRunCommand('npm run build')}
                  onAddThread={() => setActiveThread(null)}
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
                  onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
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

        <InspectorPanel isOpen={isInspectorOpen} onClose={() => setIsInspectorOpen(false)} />

        <AnimatePresence>
          {isTerminalOpen && (
            <div className="absolute bottom-0 left-0 right-0 h-72 z-50">
              <XtermTerminal />
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="absolute top-2 right-4 text-zinc-500 hover:text-zinc-900 z-[60]"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      <GlobalCommandBar />
      <CustomizationPanel
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
      />

      {isDiffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col relative">
            <button
              onClick={() => setIsDiffOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-zinc-100 rounded-full z-10"
            >
              <X size={20} className="text-zinc-500" />
            </button>
            <div className="flex-1 overflow-auto p-4">
              {activeProject ? (
                <DiffViewer
                  projectPath={activeProject.path}
                  filePath=""
                />
              ) : (
                <div className="text-center p-8 text-zinc-500">No active project selected.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodexLayout;