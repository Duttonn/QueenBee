import React from 'react';
import { Terminal, Check, X, Shield, ChevronDown, ChevronRight, FileEdit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolCallViewerProps {
  toolName: string;
  args: any;
  status: 'pending' | 'running' | 'success' | 'error' | 'rejected';
  result?: any;
  error?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

const ToolCallViewer: React.FC<ToolCallViewerProps> = ({
  toolName,
  args,
  status,
  result,
  error,
  onApprove,
  onReject
}) => {
  const [isExpanded, setIsExpanded] = React.useState(status === 'pending');

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <Shield size={14} className="text-amber-500" />;
      case 'running': return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <Check size={14} className="text-green-500" />;
      case 'error': return <X size={14} className="text-red-500" />;
      case 'rejected': return <X size={14} className="text-zinc-500" />;
      default: return <Terminal size={14} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Needs Approval';
      case 'running': return 'Running';
      case 'success': return 'Success';
      case 'error': return 'Failed';
      case 'rejected': return 'Rejected';
      default: return '';
    }
  };

  const isWriteFile = toolName === 'write_file';

  return (
    <div className="my-4 border border-white/5 rounded-2xl overflow-hidden bg-zinc-900/50 backdrop-blur-xl shadow-2xl animate-in slide-in-from-left-2 duration-300">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
            {isWriteFile ? <FileEdit size={16} className="text-blue-400" /> : <Terminal size={16} className="text-zinc-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Action
              </span>
              {status === 'pending' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                  Restricted
                </span>
              )}
            </div>
            <div className="text-[13px] font-bold text-zinc-200 font-mono tracking-tight">{toolName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
            status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
            status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
            'bg-zinc-800 border-white/5 text-zinc-400'
          }`}>
            {getStatusIcon()}
            <span className="text-[10px] font-black uppercase tracking-widest">{getStatusText()}</span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Special Content Preview for write_file */}
      {status === 'pending' && isWriteFile && args.content && (
        <div className="px-4 pt-4">
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Content Preview</div>
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 max-h-48 overflow-y-auto">
            <pre className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
              {args.content}
            </pre>
          </div>
        </div>
      )}

      {/* Args & Result Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 font-mono">
              {!isWriteFile && (
                <div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Arguments</div>
                  <pre className="bg-black/20 p-3 rounded-xl border border-white/5 text-zinc-300 text-[11px] overflow-x-auto">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              )}
              {isWriteFile && (
                <div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Target Path</div>
                  <div className="px-3 py-2 bg-black/20 rounded-lg border border-white/5 text-zinc-300 text-[11px] break-all">
                    {args.path || args.file_path}
                  </div>
                </div>
              )}
              {result && (
                <div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Result</div>
                  <pre className="bg-green-500/5 p-3 rounded-xl border border-green-500/10 text-green-400/80 text-[11px] overflow-x-auto leading-relaxed">
                    {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              {error && (
                <div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Error</div>
                  <pre className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-red-400/80 text-[11px] overflow-x-auto leading-relaxed">
                    {error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approval Buttons */}
      {status === 'pending' && (
        <div className="px-4 py-3 flex items-center justify-end gap-3 bg-white/5 border-t border-white/5">
          <button 
            onClick={onReject}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-[11px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
          >
            Reject
          </button>
          <button 
            onClick={onApprove}
            className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl flex items-center gap-2"
          >
            <Check size={14} strokeWidth={3} />
            Approve Action
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolCallViewer;