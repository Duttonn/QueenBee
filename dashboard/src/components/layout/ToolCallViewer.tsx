import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, FileEdit, Terminal, Clock } from 'lucide-react';

// Called per-tool from AgenticWorkbench (individual props) OR with toolCalls array
const ToolCallViewer = ({ toolCalls, toolName, args, status, result, error, onApprove, onReject }: any) => {
    // Individual-tool mode (called from AgenticWorkbench message bubbles)
    if (toolName !== undefined) {
        const isPending = status === 'pending';
        const isError = status === 'error' || !!error;
        const isSuccess = status === 'success';

        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl border p-3 ${
                    isPending ? 'border-amber-200 bg-amber-50/30' :
                    isError   ? 'border-rose-100 bg-rose-50/20' :
                    isSuccess ? 'border-emerald-100 bg-emerald-50/20' :
                                'border-zinc-100 bg-white'
                }`}
            >
                <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isPending ? 'bg-amber-100' : isError ? 'bg-rose-100' : 'bg-zinc-100'
                    }`}>
                        {toolName === 'write_file' ? <FileEdit size={12} className="text-blue-500" /> : <Terminal size={12} className="text-zinc-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{toolName}</span>
                            {isPending && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">
                                    <Clock size={8} />
                                    Waiting
                                </span>
                            )}
                        </div>
                        {args?.command && (
                            <p className="text-[10px] font-mono text-zinc-500 truncate">{args.command}</p>
                        )}
                        {args?.path && (
                            <p className="text-[10px] font-mono text-zinc-500 truncate">{args.path}</p>
                        )}
                        {result && !isError && (
                            <p className="text-[10px] text-zinc-400 mt-1 truncate">{typeof result === 'string' ? result.slice(0, 120) : JSON.stringify(result).slice(0, 120)}</p>
                        )}
                        {error && (
                            <p className="text-[10px] text-rose-500 mt-1 truncate">{error}</p>
                        )}
                    </div>
                </div>

                {isPending && (
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={onApprove}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Check size={11} /> Approve
                        </button>
                        <button
                            onClick={onReject}
                            className="flex-1 py-1.5 bg-zinc-100 hover:bg-rose-50 hover:text-rose-500 text-zinc-500 text-[10px] font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                            <X size={11} /> Reject
                        </button>
                    </div>
                )}
            </motion.div>
        );
    }

    // Legacy array mode
    const calls: any[] = toolCalls ?? [];
    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-blue-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action Approvals</h3>
            </div>

            <AnimatePresence>
                {calls.map((call: any) => (
                    <motion.div
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-[#0F172A] border border-slate-200 rounded-xl p-4 shadow-xl"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    {call.tool === 'write_file' ? <FileEdit size={16} className="text-[#3B82F6]" /> : <Terminal size={16} className="text-[#22C55E]" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {call.tool === 'write_file' ? 'Write File' : 'Run Command'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                                        {call.params?.path || call.params?.command}
                                    </div>
                                </div>
                            </div>
                            <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">
                                Restricted
                            </div>
                        </div>

                        {call.tool === 'write_file' && (
                            <div className="mb-4 bg-black/50 rounded-lg p-3 border border-white/5 max-h-32 overflow-y-auto">
                                <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
                                    {call.params?.content}
                                </pre>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => onApprove?.(call.id)}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Approve
                            </button>
                            <button
                                onClick={() => onReject?.(call.id)}
                                className="flex-1 py-2 bg-[#1E293B] hover:bg-red-600/20 hover:text-red-400 text-slate-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Reject
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {calls.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                    <Check size={24} className="mx-auto mb-2 text-slate-700 opacity-20" />
                    <p className="text-[10px] text-slate-600 font-medium">No pending security approvals</p>
                </div>
            )}
        </div>
    );
};

export default ToolCallViewer;
