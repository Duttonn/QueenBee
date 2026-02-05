import React from 'react';
import { Terminal, Check, X, Shield, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <Shield size={14} className="text-amber-500" />;
      case 'running': return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <Check size={14} className="text-green-500" />;
      case 'error': return <X size={14} className="text-red-500" />;
      case 'rejected': return <X size={14} className="text-gray-400" />;
      default: return <Terminal size={14} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Requires Approval';
      case 'running': return 'Executing...';
      case 'success': return 'Success';
      case 'error': return 'Failed';
      case 'rejected': return 'Rejected';
      default: return '';
    }
  };

  return (
    <div className="my-3 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between bg-zinc-50/50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Tool Call: <span className="text-zinc-900 font-mono">{toolName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            status === 'pending' ? 'bg-amber-100 text-amber-700' :
            status === 'success' ? 'bg-green-100 text-green-700' :
            status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {getStatusText()}
          </span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Args & Result */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-zinc-50/20 font-mono text-[11px] space-y-2">
              <div>
                <div className="text-gray-400 mb-1 font-sans font-semibold uppercase tracking-widest text-[9px]">Arguments</div>
                <pre className="bg-white p-2 rounded border border-gray-100 text-zinc-700 overflow-x-auto">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
              {result && (
                <div>
                  <div className="text-gray-400 mb-1 font-sans font-semibold uppercase tracking-widest text-[9px]">Result</div>
                  <pre className="bg-green-50/30 p-2 rounded border border-green-100 text-green-800 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              {error && (
                <div>
                  <div className="text-gray-400 mb-1 font-sans font-semibold uppercase tracking-widest text-[9px]">Error</div>
                  <pre className="bg-red-50/30 p-2 rounded border border-red-100 text-red-800 overflow-x-auto">
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
        <div className="px-3 py-2 flex items-center justify-end gap-2 bg-amber-50/30 border-t border-amber-100/50">
          <button 
            onClick={onReject}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-all"
          >
            Reject
          </button>
          <button 
            onClick={onApprove}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Check size={14} />
            Approve & Execute
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolCallViewer;
