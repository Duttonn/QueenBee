import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    Code2,
    Palette,
    Puzzle,
    FileCode,
    Save,
    X,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    FolderOpen,
    ChevronRight,
    ChevronDown,
    Trash2,
    Plus,
    Edit3,
    Eye,
    Terminal,
    Loader2,
    Link as LinkIcon,
    Github,
    Cpu,
    ExternalLink,
    BarChart3,
    Activity,
    CreditCard,
    Shield
} from 'lucide-react';
import yaml from 'js-yaml';
import { useAuthStore } from '../../store/useAuthStore';
import RestrictedCommands from './RestrictedCommands';

interface CustomizationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'appearance' | 'skills' | 'code' | 'plugins' | 'integrations' | 'config' | 'usage' | 'security';

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

import { API_BASE } from '../../services/api';

const CustomizationPanel = ({ isOpen, onClose }: CustomizationPanelProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('appearance');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [githubUser, setGithubUser] = useState<any>(null); // Placeholder for auth store integration

    const { forges, providers, saveApiKey } = useAuthStore();
    const githubForge = forges.find(f => f.id === 'github');

    // Appearance settings
    const [theme, setTheme] = useState({
        primaryColor: '#3B82F6',
        accentColor: '#F59E0B',
        darkMode: true,
        fontSize: 'medium',
        density: 'comfortable'
    });

    // Code editor state
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']));

    // Skills state
    const [customSkills, setCustomSkills] = useState<any[]>([
        { id: '1', name: 'React Expert', prompt: 'You are a React expert...', enabled: true },
        { id: '2', name: 'Code Reviewer', prompt: 'Review code for best practices...', enabled: true },
    ]);
    const [restrictedCommands, setRestrictedCommands] = useState<string[]>([]);

    // Load file tree on mount
    useEffect(() => {
        if (isOpen && activeTab === 'code') {
            loadFileTree();
        }
    }, [isOpen, activeTab]);

    const loadFileTree = async () => {
        // Simulated file tree - in production, this would fetch from backend
        setFileTree([
            {
                name: 'src',
                path: 'src',
                type: 'directory',
                children: [
                    {
                        name: 'components',
                        path: 'src/components',
                        type: 'directory',
                        children: [
                            {
                                name: 'layout', path: 'src/components/layout', type: 'directory', children: [
                                    { name: 'CodexLayout.tsx', path: 'src/components/layout/CodexLayout.tsx', type: 'file' },
                                    { name: 'Sidebar.tsx', path: 'src/components/layout/Sidebar.tsx', type: 'file' },
                                    { name: 'AgenticWorkbench.tsx', path: 'src/components/layout/AgenticWorkbench.tsx', type: 'file' },
                                ]
                            },
                            {
                                name: 'auth', path: 'src/components/auth', type: 'directory', children: [
                                    { name: 'LoginPage.tsx', path: 'src/components/auth/LoginPage.tsx', type: 'file' },
                                    { name: 'OnboardingFlow.tsx', path: 'src/components/auth/OnboardingFlow.tsx', type: 'file' },
                                ]
                            },
                        ]
                    },
                    {
                        name: 'store',
                        path: 'src/store',
                        type: 'directory',
                        children: [
                            { name: 'useAuthStore.ts', path: 'src/store/useAuthStore.ts', type: 'file' },
                            { name: 'useHiveStore.ts', path: 'src/store/useHiveStore.ts', type: 'file' },
                        ]
                    },
                    {
                        name: 'services',
                        path: 'src/services',
                        type: 'directory',
                        children: [
                            { name: 'api.ts', path: 'src/services/api.ts', type: 'file' },
                        ]
                    },
                    { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
                    { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
                    { name: 'index.css', path: 'src/index.css', type: 'file' },
                ]
            },
            { name: 'tailwind.config.js', path: 'tailwind.config.js', type: 'file' },
            { name: 'package.json', path: 'package.json', type: 'file' },
        ]);
    };

    const loadFile = async (path: string) => {
        setIsLoadingFile(true);
        setSelectedFile(path);

        try {
            const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`);
            if (response.ok) {
                const data = await response.json();
                setFileContent(data.content);
            } else {
                // Fallback - show placeholder
                setFileContent(`// File: ${path}\n// Could not load file. Make sure the files API is running.\n\n// You can edit this file and save changes.`);
            }
        } catch (error) {
            setFileContent(`// File: ${path}\n// Error loading file\n`);
        }

        setIsLoadingFile(false);
    };

    const saveFile = async () => {
        if (!selectedFile || !fileContent) return;

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const response = await fetch(`${API_BASE}/api/files`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: selectedFile,
                    content: fileContent
                })
            });

            if (response.ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            setSaveStatus('error');
        }

        setIsSaving(false);
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const renderFileTree = (nodes: FileNode[], depth = 0) => (
        <div style={{ paddingLeft: depth * 12 }}>
            {nodes.map(node => (
                <div key={node.path}>
                    {node.type === 'directory' ? (
                        <>
                            <button
                                onClick={() => toggleFolder(node.path)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-sm text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 rounded transition-colors"
                            >
                                {expandedFolders.has(node.path) ? (
                                    <ChevronDown size={14} />
                                ) : (
                                    <ChevronRight size={14} />
                                )}
                                <FolderOpen size={14} className="text-amber-400" />
                                <span>{node.name}</span>
                            </button>
                            {expandedFolders.has(node.path) && node.children && (
                                renderFileTree(node.children, depth + 1)
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => loadFile(node.path)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-sm rounded transition-colors ${selectedFile === node.path
                                ? 'bg-blue-50 text-[#3B82F6]'
                                : 'text-slate-500 hover:text-[#0F172A] hover:bg-slate-50'
                                }`}
                        >
                            <FileCode size={14} className="text-[#3B82F6] ml-4" />
                            <span>{node.name}</span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-5xl h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg">
                                <Settings className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#0F172A]">Customize Queen Bee</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Settings & Configuration</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-56 border-r border-slate-100 bg-slate-50/50 backdrop-blur-xl p-2 flex flex-col gap-1">
                            <TabButton
                                active={activeTab === 'appearance'}
                                onClick={() => setActiveTab('appearance')}
                                icon={<Palette size={16} />}
                                label="Appearance"
                            />
                            <TabButton
                                active={activeTab === 'skills'}
                                onClick={() => setActiveTab('skills')}
                                icon={<Puzzle size={16} />}
                                label="Custom Skills"
                            />
                            <TabButton
                                active={activeTab === 'code'}
                                onClick={() => setActiveTab('code')}
                                icon={<Code2 size={16} />}
                                label="Source Code"
                            />
                            <TabButton
                                active={activeTab === 'integrations'}
                                onClick={() => setActiveTab('integrations')}
                                icon={<LinkIcon size={16} />}
                                label="Integrations"
                            />
                            <TabButton
                                active={activeTab === 'plugins'}
                                onClick={() => setActiveTab('plugins')}
                                icon={<Terminal size={16} />}
                                label="Plugins"
                            />
                            <TabButton
                                active={activeTab === 'config'}
                                onClick={() => setActiveTab('config')}
                                icon={<FileCode size={16} />}
                                label="Config (YAML)"
                            />
                            <TabButton
                                active={activeTab === 'usage'}
                                onClick={() => setActiveTab('usage')}
                                icon={<BarChart3 size={16} />}
                                label="Usage & Billing"
                            />
                            <div className="pt-2 mt-2 border-t border-slate-100">
                                <TabButton
                                    active={activeTab === 'security'}
                                    onClick={() => setActiveTab('security')}
                                    icon={<Shield size={16} />}
                                    label="Security"
                                />
                            </div>

                            {/* Warning */}
                            <div className="mt-auto p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
                                    <p className="text-[11px] font-medium text-amber-900">
                                        Changes to source code require a dev server restart.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-white">
                            <AnimatePresence mode="wait">
                                {activeTab === 'appearance' && (
                                    <AppearanceTab theme={theme} setTheme={setTheme} />
                                )}

                                {activeTab === 'skills' && (
                                    <SkillsTab skills={customSkills} setSkills={setCustomSkills} />
                                )}

                                {activeTab === 'integrations' && (
                                    <IntegrationsTab
                                        providers={providers}
                                        onSaveKey={saveApiKey}
                                        githubForge={githubForge}
                                    />
                                )}

                                {activeTab === 'code' && (
                                    <CodeTab
                                        fileTree={fileTree}
                                        selectedFile={selectedFile}
                                        fileContent={fileContent}
                                        setFileContent={setFileContent}
                                        isLoadingFile={isLoadingFile}
                                        isSaving={isSaving}
                                        saveStatus={saveStatus}
                                        onSave={saveFile}
                                        renderFileTree={renderFileTree}
                                    />
                                )}

                                {activeTab === 'plugins' && (
                                    <PluginsTab />
                                )}

                                {activeTab === 'usage' && (
                                    <UsageTab />
                                )}

                                {activeTab === 'security' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="p-8 overflow-y-auto flex-1 bg-zinc-50/30"
                                    >
                                        <div className="max-w-3xl mx-auto">
                                            <div className="mb-8">
                                                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Security & Permissions</h2>
                                                <p className="text-zinc-500 text-sm">Manage restricted commands and access controls for autonomous agents.</p>
                                            </div>
                                            <RestrictedCommands />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Usage Tab Component
const UsageTab = () => {
    const [usage, setUsage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/usage`);
                if (res.ok) {
                    const data = await res.json();
                    setUsage(data);
                }
            } catch (err) {
                console.error('Failed to fetch usage', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsage();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 overflow-y-auto flex-1 bg-zinc-50/30"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">Model Usage & Credits</h3>
                    <p className="text-sm text-slate-500 mt-1">Monitor your AI consumption across all providers.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-600 mb-3">
                            <Activity size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Tokens</span>
                        </div>
                        <div className="text-2xl font-black text-[#0F172A]">
                            {usage?.summary?.totalTokens?.toLocaleString() || 0}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Across all sessions</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-600 mb-3">
                            <CreditCard size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Estimated Cost</span>
                        </div>
                        <div className="text-2xl font-black text-[#0F172A]">
                            ${usage?.summary?.totalCost?.toFixed(4) || '0.0000'}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Estimated in USD</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 text-purple-600 mb-3">
                            <Cpu size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Models</span>
                        </div>
                        <div className="text-2xl font-black text-[#0F172A]">
                            {Object.keys(usage?.byModel || {}).length}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Current unique models</p>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">By Provider</h4>
                        <div className="space-y-4">
                            {Object.entries(usage?.byProvider || {}).map(([provider, tokens]: any) => (
                                <div key={provider}>
                                    <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wider">
                                        <span className="text-[#0F172A]">{provider}</span>
                                        <span className="text-slate-400">{tokens.toLocaleString()} tkn</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${Math.min(100, (tokens / (usage?.summary?.totalTokens || 1)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">By Model</h4>
                        <div className="space-y-4">
                            {Object.entries(usage?.byModel || {}).map(([model, tokens]: any) => (
                                <div key={model}>
                                    <div className="flex justify-between text-xs font-bold mb-1.5 truncate tracking-wider">
                                        <span className="text-[#0F172A] uppercase truncate mr-2">{model}</span>
                                        <span className="text-slate-400 flex-shrink-0">{tokens.toLocaleString()} tkn</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full" 
                                            style={{ width: `${Math.min(100, (tokens / (usage?.summary?.totalTokens || 1)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Calls</h4>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Last 1000 events</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tokens</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {usage?.history?.slice().reverse().map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-[#0F172A] truncate uppercase tracking-tight">{item.model}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.providerId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-[#0F172A] text-right font-mono">
                                            {item.totalTokens.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-emerald-600 text-right font-mono">
                                            ${item.cost.toFixed(5)}
                                        </td>
                                    </tr>
                                ))}
                                {(!usage?.history || usage.history.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                                            No usage recorded yet. Start a chat to see statistics.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
            ? 'bg-[#0F172A] text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
            }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// Config Tab

const ConfigTab = () => {
    const [configYaml, setConfigYaml] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/config`);
            if (!res.ok) throw new Error('Failed to load config');
            const data = await res.json();
            setConfigYaml(yaml.dump(data));
        } catch (error: any) {
            setErrorMessage(error.message);
        }
        setIsLoading(false);
    };

    const saveConfig = async () => {
        setIsSaving(true);
        setStatus('idle');
        setErrorMessage(null);

        try {
            const json = yaml.load(configYaml);
            const res = await fetch(`${API_BASE}/api/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
            });

            if (!res.ok) throw new Error('Failed to save config');

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || 'Invalid YAML format');
        }
        setIsSaving(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden bg-white"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Global Configuration</h3>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Edit hive parameters</p>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'success' && (
                        <span className="flex items-center gap-1 text-xs text-[#22C55E] font-medium">
                            <CheckCircle2 size={12} />
                            Saved Successfully
                        </span>
                    )}
                    <button
                        onClick={saveConfig}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg"
                    >
                        {isSaving ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Save size={12} />
                        )}
                        Apply Config
                    </button>
                    <button
                        onClick={loadConfig}
                        disabled={isSaving || isLoading}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative bg-slate-50/50">
                {errorMessage && (
                    <div className="absolute top-0 left-0 right-0 p-2 bg-red-50 border-b border-red-100 text-red-600 text-xs text-center font-medium">
                        {errorMessage}
                    </div>
                )}
                <textarea
                    value={configYaml}
                    onChange={(e) => setConfigYaml(e.target.value)}
                    className="w-full h-full bg-transparent text-[#1E293B] font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed"
                    spellCheck={false}
                    disabled={isLoading}
                />
            </div>
        </motion.div>
    );
};

// Appearance Tab
const AppearanceTab = ({ theme, setTheme }: any) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-6 overflow-y-auto"
    >
        <h3 className="text-lg font-bold text-[#0F172A] mb-6">Theme & Appearance</h3>

        <div className="space-y-6">
            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                        Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={theme.primaryColor}
                            onChange={e => setTheme({ ...theme, primaryColor: e.target.value })}
                            className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        />
                        <input
                            type="text"
                            value={theme.primaryColor}
                            onChange={e => setTheme({ ...theme, primaryColor: e.target.value })}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B]"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                        Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={theme.accentColor}
                            onChange={e => setTheme({ ...theme, accentColor: e.target.value })}
                            className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        />
                        <input
                            type="text"
                            value={theme.accentColor}
                            onChange={e => setTheme({ ...theme, accentColor: e.target.value })}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B]"
                        />
                    </div>
                </div>
            </div>

            {/* Font Size */}
            <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                    Font Size
                </label>
                <div className="flex gap-2">
                    {['small', 'medium', 'large'].map(size => (
                        <button
                            key={size}
                            onClick={() => setTheme({ ...theme, fontSize: size })}
                            className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${theme.fontSize === size
                                ? 'bg-[#3B82F6] text-white'
                                : 'bg-slate-100 text-slate-500 hover:text-[#0F172A]'
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Density */}
            <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                    UI Density
                </label>
                <div className="flex gap-2">
                    {['compact', 'comfortable', 'spacious'].map(density => (
                        <button
                            key={density}
                            onClick={() => setTheme({ ...theme, density })}
                            className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${theme.density === density
                                ? 'bg-[#3B82F6] text-white'
                                : 'bg-slate-100 text-slate-500 hover:text-[#0F172A]'
                                }`}
                        >
                            {density}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </motion.div>
);

// Skills Tab
const SkillsTab = ({ skills, setSkills }: any) => {
    const [editingSkill, setEditingSkill] = useState<string | null>(null);
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillPrompt, setNewSkillPrompt] = useState('');

    const addSkill = () => {
        if (!newSkillName.trim()) return;
        setSkills([...skills, {
            id: Date.now().toString(),
            name: newSkillName,
            prompt: newSkillPrompt,
            enabled: true
        }]);
        setNewSkillName('');
        setNewSkillPrompt('');
    };

    const deleteSkill = (id: string) => {
        setSkills(skills.filter((s: any) => s.id !== id));
    };

    const toggleSkill = (id: string) => {
        setSkills(skills.map((s: any) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        ));
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 overflow-y-auto flex-1"
        >
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Custom Skills</h3>
            <p className="text-sm text-slate-400 mb-6">
                Define custom behaviors and personas for the AI agents.
            </p>

            {/* Existing Skills */}
            <div className="space-y-3 mb-6">
                {skills.map((skill: any) => (
                    <div
                        key={skill.id}
                        className={`p-4 rounded-xl border transition-colors ${skill.enabled
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-50 border-slate-100 opacity-50'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleSkill(skill.id)}
                                    className={`w-10 h-6 rounded-full transition-colors ${skill.enabled ? 'bg-[#22C55E]' : 'bg-slate-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${skill.enabled ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                </button>
                                <span className="font-medium text-[#1E293B]">{skill.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setEditingSkill(editingSkill === skill.id ? null : skill.id)}
                                    className="p-1.5 text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 rounded transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => deleteSkill(skill.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {editingSkill === skill.id && (
                            <textarea
                                value={skill.prompt}
                                onChange={e => setSkills(skills.map((s: any) =>
                                    s.id === skill.id ? { ...s, prompt: e.target.value } : s
                                ))}
                                className="w-full mt-2 bg-white border border-slate-200 rounded-lg p-3 text-sm text-[#1E293B] resize-none focus:border-[#3B82F6] outline-none"
                                rows={4}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Add New Skill */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Plus size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-500">Add New Skill</span>
                </div>
                <input
                    type="text"
                    value={newSkillName}
                    onChange={e => setNewSkillName(e.target.value)}
                    placeholder="Skill name..."
                    className="w-full mb-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] placeholder-slate-400 outline-none focus:border-[#3B82F6]"
                />
                <textarea
                    value={newSkillPrompt}
                    onChange={e => setNewSkillPrompt(e.target.value)}
                    placeholder="System prompt for this skill..."
                    className="w-full mb-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] placeholder-slate-400 resize-none outline-none focus:border-[#3B82F6]"
                    rows={3}
                />
                <button
                    onClick={addSkill}
                    disabled={!newSkillName.trim()}
                    className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Add Skill
                </button>
            </div>
        </motion.div>
    );
};

// Code Tab
const CodeTab = ({
    fileTree,
    selectedFile,
    fileContent,
    setFileContent,
    isLoadingFile,
    isSaving,
    saveStatus,
    onSave,
    renderFileTree
}: any) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 flex overflow-hidden"
    >
        {/* File Tree */}
        <div className="w-64 border-r border-slate-100 overflow-y-auto p-2 bg-white">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2">
                Source Files
            </div>
            {renderFileTree(fileTree)}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile ? (
                <>
                    {/* File Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <FileCode size={14} className="text-[#3B82F6]" />
                            <span className="text-sm text-slate-600 font-medium">{selectedFile}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {saveStatus === 'success' && (
                                <span className="flex items-center gap-1 text-xs text-[#22C55E]">
                                    <CheckCircle2 size={12} />
                                    Saved
                                </span>
                            )}
                            <button
                                onClick={onSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                {isSaving ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Save size={12} />
                                )}
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 overflow-hidden">
                        {isLoadingFile ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="animate-spin text-slate-400" size={24} />
                            </div>
                        ) : (
                            <textarea
                                value={fileContent}
                                onChange={e => setFileContent(e.target.value)}
                                className="w-full h-full bg-slate-50 text-[#1E293B] text-sm font-mono p-4 resize-none focus:outline-none leading-relaxed"
                                spellCheck={false}
                            />
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/30">
                    <div className="text-center">
                        <FileCode size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium uppercase tracking-widest">Select a file to edit</p>
                    </div>
                </div>
            )}
        </div>
    </motion.div>
);

// Plugins Tab
const PluginsTab = () => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-6 overflow-y-auto"
    >
        <h3 className="text-lg font-bold text-[#0F172A] mb-2">Plugins</h3>
        <p className="text-sm text-slate-400 mb-6">
            Extend Queen Bee with community plugins.
        </p>

        <div className="space-y-3">
            <PluginCard
                name="Git Diff Viewer"
                description="Enhanced diff visualization with syntax highlighting"
                installed={true}
                author="queenbee"
            />
            <PluginCard
                name="Voice Commands"
                description="Control agents with voice input"
                installed={false}
                author="community"
            />
            <PluginCard
                name="Jira Integration"
                description="Sync tasks and create tickets automatically"
                installed={false}
                author="enterprise"
            />
        </div>
    </motion.div>
);

const PluginCard = ({ name, description, installed, author }: any) => (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[#1E293B]">{name}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">
                    {author}
                </span>
            </div>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
        <button
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${installed
                ? 'bg-slate-200 text-slate-500'
                : 'bg-[#3B82F6] text-white hover:bg-blue-600 shadow-sm'
                }`}
        >
            {installed ? 'Installed' : 'Install'}
        </button>
    </div>
);

const IntegrationsTab = ({ providers, onSaveKey, githubForge }: any) => {
    const [newRepoUrl, setNewRepoUrl] = useState('');

    const handleConnectGithub = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/github`);
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (e) {
            console.error('Login failed', e);
        }
    };

    const handleAddRepo = () => {
        if (!newRepoUrl) return;
        // Logic to add repo manually if supported
        setNewRepoUrl('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 overflow-y-auto"
        >
            <h3 className="text-lg font-bold text-[#0F172A] mb-6">Integrations & Connections</h3>

            {/* GitHub Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Github className="text-[#0F172A]" size={20} />
                    <h4 className="text-md font-semibold text-[#0F172A]">GitHub Repositories</h4>
                </div>

                {!githubForge?.connected ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <Github size={32} className="text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm mb-4">Connect GitHub to see your repositories</p>
                        <button
                            onClick={handleConnectGithub}
                            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-md"
                        >
                            Connect GitHub Account
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newRepoUrl}
                                onChange={(e) => setNewRepoUrl(e.target.value)}
                                placeholder="https://github.com/username/repo"
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:border-[#3B82F6] transition-colors"
                            />
                            <button
                                onClick={handleAddRepo}
                                className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={16} />
                                Add Repo
                            </button>
                        </div>

                        <div className="space-y-2">
                            {githubForge.repositories && githubForge.repositories.length > 0 ? (
                                githubForge.repositories.map((repo: any) => (
                                    <div key={repo.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Github size={16} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[#1E293B]">{repo.name}</p>
                                                <p className="text-[10px] text-[#22C55E] font-bold uppercase flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Connected
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                    No repositories found.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Models Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Cpu className="text-[#0F172A]" size={20} />
                    <h4 className="text-md font-semibold text-[#0F172A]">AI Model Providers</h4>
                </div>

                <div className="space-y-4">
                    {providers.map((provider: any) => (
                        <ProviderCard
                            key={provider.id}
                            id={provider.id}
                            name={provider.name}
                            icon={<span>{provider.icon}</span>}
                            status={provider.connected ? "Connected" : "Not Configured"}
                            apiKey={provider.apiKey || ''}
                            onSave={(val: string) => onSaveKey(provider.id, val)}
                            authType={provider.authType}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const ProviderCard = ({ id, name, icon, status, apiKey: initialApiKey, onSave, authType }: any) => {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setApiKey(initialApiKey);
    }, [initialApiKey]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(apiKey);
        } catch (e) {
            console.error('Failed to save API key', e);
        }
        setIsSaving(false);
    };

    const handleConnectOAuth = async () => {
        setIsSaving(true);
        try {
            const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
            const mode = isElectron ? 'electron' : 'web';
            const response = await fetch(`${API_BASE}/api/auth/login?provider=${id}&mode=${mode}`);
            const data = await response.json();
            
            if (data.url) {
                window.open(data.url, `${id}-oauth`, 'width=600,height=700');
            } else {
                throw new Error('Failed to get authorization URL');
            }
        } catch (error: any) {
            console.error('OAuth initiation failed', error);
        }
        setIsSaving(false);
    };

    return (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                        {icon}
                    </div>
                    <div>
                        <h5 className="text-sm font-medium text-[#1E293B]">{name}</h5>
                        <p className={`text-[10px] font-bold uppercase ${status === 'Connected' ? 'text-[#22C55E]' : 'text-slate-400'}`}>
                            {status}
                        </p>
                    </div>
                </div>
            </div>
            <div>
                {authType === 'oauth' ? (
                    <button
                        onClick={handleConnectOAuth}
                        disabled={isSaving}
                        className="w-full px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        Connect with {name}
                    </button>
                ) : (
                    <>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:border-[#3B82F6] transition-colors font-mono"
                            />
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomizationPanel;