import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ArrowUp,
  Cpu,
  Zap,
  Layers,
  Bot,
  User,
  MessageSquare,
  Settings,
  Menu,
  X,
  Play,
  Loader2,
  ChevronDown,
  Eye,
  GitCommit,
  Monitor,
  Check,
  Mic
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import { 
  getProjects, 
  sendChatMessageStream, 
  getGitDiff, 
  executeCommand,
  type Message,
  type ToolCall 
} from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import Sidebar from './Sidebar';
import AgenticWorkbench from './AgenticWorkbench';
import GlobalCommandBar from './GlobalCommandBar';
import InspectorPanel from './InspectorPanel';
import CustomizationPanel from '../settings/CustomizationPanel';
import UniversalAuthModal from './UniversalAuthModal';
import CommitModal from '../projects/CommitModal';
import DiffViewer from '../projects/DiffViewer';
import { ProjectOverview } from '../projects/ProjectOverview';
import InboxPanel from './InboxPanel';
import SkillsManager from './SkillsManager';
import AutomationDashboard from './AutomationDashboard';
import XtermTerminal from './XtermTerminal';
import DictationOverlay from './DictationOverlay';
import { NativeService } from '../../services/NativeService';

// Composer Bar Component
interface ComposerBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  mode: 'local' | 'worktree' | 'cloud';
  onModeChange: (mode: 'local' | 'worktree' | 'cloud') => void;
  availableModels: { name: string, provider: string }[];
  selectedModel: string;
  onModelSelect: (model: string, provider: string) => void;
  composerMode?: 'code' | 'chat' | 'plan';
  onComposerModeChange?: (mode: 'code' | 'chat' | 'plan') => void;
  effort?: 'low' | 'medium' | 'high';
  onEffortChange?: (effort: 'low' | 'medium' | 'high') => void;
}

const ComposerBar = ({ value, onChange, onSubmit, onStop, isLoading, mode, onModeChange, availableModels, selectedModel, onModelSelect, composerMode, onComposerModeChange, effort, onEffortChange }: ComposerBarProps) => {
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

      <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xl flex flex-col">
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

            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = (e: any) => {
                  const files = Array.from(e.target.files).map((f: any) => f.name);
                  if (files.length > 0) {
                    onChange(value ? `${value} @${files.join(' @')}` : `@${files.join(' @')}`);
                  }
                };
                input.click();
              }}
              className="p-2 hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all"
              title="Import Files"
            >
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

            {/* Composer Mode: Code / Chat / Plan */}
            <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {(['code', 'chat', 'plan'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onComposerModeChange?.(m)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${composerMode === m
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
                      className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-[60] p-1"
                    >
                      <div className="px-3 py-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 mb-1">
                        AI Model
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {availableModels.map((m, idx) => {
                          const showProviderHeader = idx === 0 || availableModels[idx-1].provider !== m.provider;
                          return (
                            <React.Fragment key={`${m.provider}-${m.name}`}>
                              {showProviderHeader && (
                                <div className="px-3 py-1.5 text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] bg-blue-50/50 mt-1 first:mt-0 mb-1 rounded-lg">
                                  {m.provider}
                                </div>
                              )}
                              <button
                                onClick={() => { onModelSelect(m.name, m.provider); setIsModelMenuOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${m.name === selectedModel
                                  ? 'bg-zinc-900 text-white shadow-lg'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                                  }`}
                              >
                                {m.name}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Effort Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {(['low', 'medium', 'high'] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => onEffortChange?.(e)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${effort === e
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}`}
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Mic size={18} strokeWidth={1.5} />}
            </button>
            {isLoading ? (
              <button
                onClick={onStop}
                className="p-2.5 rounded-xl transition-all shadow-xl bg-rose-500 text-white hover:bg-rose-600 active:scale-95 animate-pulse"
                title="Stop Generation"
              >
                <div className="w-3 h-3 bg-white rounded-[2px]" />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!value.trim()}
                className={`p-2.5 rounded-xl transition-all shadow-lg ${!value.trim()
                  ? 'bg-zinc-100 text-zinc-300'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95'
                  }`}
              >
                <Play size={18} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeView, setActiveView] = useState<'build' | 'automations' | 'skills' | 'triage'>('build');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executionMode, setExecutionMode] = useState<'local' | 'worktree' | 'cloud'>('local');
  const [composerMode, setComposerMode] = useState<'code' | 'chat' | 'plan'>('code');
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('high');
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0, filesCount: 0 });

  const { 
    projects, 
    fetchProjects, 
    fetchTasks, 
    addProject: addAppProject, 
    activeThreadId, 
    setActiveThread, 
    addThread, 
    addMessage, 
    updateLastMessage,
    replaceLastMessage,
    updateThread,
    updateToolCall,
    selectedProjectId,
    setSelectedProjectId
  } = useHiveStore();
  const { isCommandBarOpen, setCommandBarOpen } = useAppStore();
  const { activeProviderId, providers, setActiveProvider } = useAuthStore();

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const fetchData = async () => {
    try {
      await Promise.all([fetchProjects(), fetchTasks()]);
      if (activeProject?.path) {
        const diff = await getGitDiff(activeProject.path);
        setDiffStats({ added: diff.added, removed: diff.removed, filesCount: diff.files.length });
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    const handleStartSwarm = (e: any) => {
      const { name } = e.detail;
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
  }, []); // Only run once on mount to avoid infinite loops

  const availableModels = React.useMemo(() => providers
    .filter(p => p.connected)
    .flatMap(p => (p.models || []).map(m => ({ name: m, provider: p.id })))
    .sort((a, b) => a.provider.localeCompare(b.provider)), [providers]);

  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (availableModels.length > 0) {
      const isCurrentModelValid = selectedModel && availableModels.some(m => m.name === selectedModel);
      if (!isCurrentModelValid) {
        const geminiFlash = availableModels.find(m => m.name.includes('flash'));
        const nextModel = geminiFlash?.name || availableModels[0].name;
        const nextProvider = geminiFlash?.provider || availableModels[0].provider;

        if (selectedModel !== nextModel) {
          setSelectedModel(nextModel);
        }
        if (activeProviderId !== nextProvider) {
          setActiveProvider(nextProvider);
        }
      }
    } else if (selectedModel !== '') {
      setSelectedModel('');
    }
  }, [availableModels, selectedModel, activeProviderId, setActiveProvider]);

  const handleSendMessage = useCallback(async (contentOverride?: string) => {
    const content = contentOverride || inputValue;
    if (!content.trim() || isLoading || !selectedProjectId) return;

    // Ensure the current thread ID actually belongs to the selected project
    const threadExists = activeProject?.threads?.some((t: any) => t.id === activeThreadId);
    let currentThreadId = threadExists ? activeThreadId : null;
    
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      await addThread(selectedProjectId, {
        id: currentThreadId,
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        diff: '+0 -0',
        time: 'Just now'
      });
    }

    const userMessage: Message = { role: 'user', content: content };
    addMessage(selectedProjectId, currentThreadId, userMessage);
    if (!contentOverride) setInputValue('');
    setIsLoading(true);
    addMessage(selectedProjectId, currentThreadId, { role: 'assistant', content: '' });

    const activeProvider = providers.find(p => p.id === activeProviderId);
    const providerToUse = activeProvider?.id || 'mock';
    const modelToUse = selectedModel || availableModels[0]?.name || 'mock-model';
    const apiKey = activeProvider?.apiKey;
    const thread = activeProject?.threads?.find((t: any) => t.id === currentThreadId);
    const agentId = thread?.agentId;

    // Plan Mode Context
    let augmentedMessages = [...messages, userMessage];
    if (activeView === 'build' && activeThreadId === null && !threadExists) {
        // ...
    }

    try {
      await sendChatMessageStream(
        {
          model: modelToUse,
          messages: augmentedMessages,
          provider: providerToUse as any,
          apiKey: apiKey,
          projectPath: activeProject?.path,
          threadId: currentThreadId,
          mode: executionMode,
          composerMode: composerMode,
          effort: effort,
          agentId: agentId,
          systemPrompt: activeView === 'build' && !activeThreadId ? `You are currently in PLANNING MODE for the project "${activeProject?.name}". 
          
          CRITICAL CONSTRAINTS:
          1. READ-ONLY ACCESS: You have read-only access to the entire codebase. You may use tools like \`read_file\`, \`list_directory\`, \`glob\`, and \`search_file_content\` to explore and understand the project.
          2. NO MODIFICATIONS: You are FORBIDDEN from using \`write_file\`, \`replace\`, or any shell commands that modify code, EXCEPT for the "PLAN.md" file in the project root.
          3. PLAN.md SOVEREIGNTY: Your primary goal is to help the user define their vision and create/update a "PLAN.md" file in the project root. This is the ONLY file you are allowed to write to.
          
          The PLAN.md should follow this structure:
          # 🗺 Project Plan: [Project Name]
          
          ## 🎯 Vision & Goals
          [Summary of the project's purpose]
          
          ## 🚀 Phase 1: Short-Term (Now)
          - [ ] \`TASK-01\`: [Description]
          
          ## 🛠 Phase 2: Mid-Term (Next)
          - [ ] \`TASK-03\`: [Description]
          
          ## 🧠 Phase 3: Long-Term (Future)
          - [ ] \`TASK-04\`: [Description]
          
          If the user mentions screenshots or images, include them in the markdown as ![]() references.
          Always use the \`write_file\` tool to create or update the PLAN.md file. 
          Use the conventional task format: - [ ] \`ID\`: Title` : undefined
        } as any,
        (chunk) => updateLastMessage(selectedProjectId, currentThreadId!, chunk),
        async () => {
          setIsLoading(false);
          try {
            const diff = await getGitDiff(activeProject?.path || '../');
            setDiffStats({ added: diff.added, removed: diff.removed, filesCount: diff.files.length });
            updateThread(selectedProjectId, currentThreadId!, {
              diff: `+${diff.added} -${diff.removed}`,
              time: 'Just now'
            });
          } catch { }
        },
        (error) => {
          updateLastMessage(selectedProjectId, currentThreadId!, `\n\nError: ${error.message}`);
          setIsLoading(false);
        },
        (event) => {
          const thread = useHiveStore.getState().projects
            .find(p => p.id === selectedProjectId)
            ?.threads?.find((t: any) => t.id === currentThreadId);
          const msgIndex = (thread?.messages?.length || 1) - 1;

          if (event.type === 'tool_start') {
            updateToolCall(selectedProjectId, currentThreadId!, msgIndex, event.data.toolCallId, {
              status: 'running',
              name: event.data.toolName,
              arguments: event.data.args
            });
          } else if (event.type === 'tool_end') {
            updateToolCall(selectedProjectId, currentThreadId!, msgIndex, event.data.toolCallId, {
              status: 'success',
              result: event.data.result
            });
          } else if (event.type === 'tool_error') {
            updateToolCall(selectedProjectId, currentThreadId!, msgIndex, event.data.toolCallId, {
              status: 'error',
              error: event.data.error
            });
          } else if (event.type === 'step_start' || event.type === 'agent_status') {
            if (event.data.status) {
              useHiveStore.getState().setQueenStatus(event.data.status);
            }
          }
        },
        (fullMessage: any) => {
          const thread = useHiveStore.getState().projects
            .find(p => p.id === selectedProjectId)
            ?.threads?.find((t: any) => t.id === currentThreadId);
          
          const threadMessages = thread?.messages || [];
          const lastMsg = threadMessages[threadMessages.length - 1];
          
          const updates: any = {
            role: fullMessage.role,
            content: fullMessage.content || '',
            name: fullMessage.name,
            tool_call_id: fullMessage.tool_call_id,
            toolCalls: fullMessage.tool_calls?.map((tc: any) => ({
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
              status: 'success'
            }))
          };

          const isPlaceholder = lastMsg && lastMsg.role === 'assistant' && !lastMsg.content && (!lastMsg.toolCalls || lastMsg.toolCalls.length === 0);
          
          if (isPlaceholder) {
            replaceLastMessage(selectedProjectId, currentThreadId!, updates);
          } else {
            addMessage(selectedProjectId, currentThreadId!, updates);
          }
        }
      );
    } catch (error) {
      console.error('[CodexLayout] sendChatMessageStream crashed:', error);
      setIsLoading(false);
    }
  }, [inputValue, messages, isLoading, selectedProjectId, activeThreadId, activeProviderId, providers, selectedModel, availableModels, activeProject, executionMode, addThread, addMessage, updateLastMessage, replaceLastMessage, updateThread, updateToolCall]);

  const handleStartThreadFromDiff = (prompt: string) => {
      setIsDiffOpen(false);
      setActiveThread(null);
      handleSendMessage(prompt);
  };

  const handleOpen = async () => {
    const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
    
    if (isElectron) {
        const result = await NativeService.dialog.showOpen({
          properties: ['openDirectory'],
          title: 'Select Project Folder'
        });
        if (!result.canceled && result.filePaths.length > 0) {
          const path = result.filePaths[0];
          const name = path.split('/').pop() || 'Untitled';
          try {
            await addAppProject({ id: `proj-${Date.now()}`, name, path, threads: [], agents: [] });
            NativeService.notify('Project Added', `Successfully added ${name}`);
          } catch (e: any) {
            NativeService.dialog.showMessage({ type: 'error', message: 'Failed to add project', detail: e.message });
          }
        }
    } else {
        // Web Mode Fallback: Use a prompt to get the absolute path
        const path = window.prompt("Please enter the absolute path to your project folder:");
        if (path) {
            const name = path.split('/').pop() || 'Untitled';
            try {
                await addAppProject({ id: `proj-${Date.now()}`, name, path, threads: [], agents: [] });
                alert(`Project ${name} added successfully!`);
            } catch (e: any) {
                alert(`Failed to add project: ${e.message}`);
            }
        }
    }
  };

  const handleOpenIn = async (app: 'vscode' | 'finder' | 'terminal' | 'xcode') => {
    if (!activeProject?.path) return;
    
    let command = '';
    switch (app) {
      case 'vscode': command = `code "${activeProject.path}"`; break;
      case 'finder': command = `open "${activeProject.path}"`; break;
      case 'terminal': command = `open -a Terminal "${activeProject.path}"`; break;
      case 'xcode': command = `open -a Xcode "${activeProject.path}"`; break;
    }

    if (command) {
      try {
        await executeCommand(command);
        NativeService.notify('Project Opened', `Opened in ${app}`);
      } catch (e: any) {
        console.error('Failed to open project:', e);
      }
    }
  };

  const handleRun = () => alert('Run logic');
  const handleCommit = async () => {
    console.log('Commit action triggered');
    setIsCommitModalOpen(true);
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

  const handleStop = () => {
    setIsLoading(false);
    // In a real app, this would also signal the AbortController of the stream
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
                onSearchClick={() => setCommandBarOpen(true)}
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

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-zinc-50/30 w-full">
        <div className="flex-1 flex min-h-0 overflow-hidden relative w-full">
          {activeView === 'automations' ? (
            <AutomationDashboard />
          ) : activeView === 'triage' ? (
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
                  onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
                  onToggleDiff={() => setIsDiffOpen(prev => !prev)}
                  onRun={handleRunProject}
                  onCommit={handleCommit}
                  onBuild={() => handleRunCommand('npm run build')}
                  onAddThread={() => setActiveThread(null)}
                  onOpenIn={handleOpenIn}
                  mode={executionMode}
                  onModeChange={setExecutionMode}
                  diffStats={diffStats}
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
                onStop={handleStop}
                isLoading={isLoading}
                mode={executionMode}
                onModeChange={setExecutionMode}
                availableModels={availableModels}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                composerMode={composerMode}
                onComposerModeChange={setComposerMode}
                effort={effort}
                onEffortChange={setEffort}
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

      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        projectPath={activeProject?.path || ''}
        onCommitSuccess={() => {
          fetchData();
          setIsDiffOpen(false);
        }}
      />

      {isDiffOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
            onClick={() => setIsDiffOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
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
                  onStartThread={handleStartThreadFromDiff}
                  onClose={() => setIsDiffOpen(false)}
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

const EmptyState = ({ onOpenSettings, onRun, onCommit, onOpen, onToggleTerminal, onToggleInspector }: any) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/30">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md"
    >
      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-black/20">
        <Bot size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight uppercase">Ready to Build?</h1>
      <p className="text-zinc-500 mb-10 text-lg leading-relaxed">
        Select a project from the sidebar or open a local folder to begin your autonomous development journey.
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpen}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-900 hover:bg-zinc-50 transition-all shadow-sm"
        >
          <Plus size={18} className="text-blue-500" />
          Open Project
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-900 hover:bg-zinc-50 transition-all shadow-sm"
        >
          <Settings size={18} className="text-zinc-400" />
          Settings
        </button>
      </div>
    </motion.div>
  </div>
);

export default CodexLayout;