import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, FileEdit, Terminal } from 'lucide-react';

interface ToolCall {
    id: string;
    tool: 'write_file' | 'run_shell' | 'read_file';
    params: any;
    status: 'pending' | 'approved' | 'rejected';
}

const ToolCallViewer = ({ toolCalls = [], onApprove, onReject }: any) => {
    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-blue-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action Approvals</h3>
            </div>

            <AnimatePresence>
                {toolCalls.map((call: ToolCall) => (
                    <motion.div
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    {call.tool === 'write_file' ? <FileEdit size={16} className="text-blue-400" /> : <Terminal size={16} className="text-green-400" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {call.tool === 'write_file' ? 'Write File' : 'Run Command'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                                        {call.params.path || call.params.command}
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
                                    {call.params.content}
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
                                className="flex-1 py-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Reject
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {toolCalls.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                    <Check size={24} className="mx-auto mb-2 text-slate-700 opacity-20" />
                    <p className="text-[10px] text-slate-600 font-medium">No pending security approvals</p>
                </div>
            )}
        </div>
    );
};

export default ToolCallViewer;
