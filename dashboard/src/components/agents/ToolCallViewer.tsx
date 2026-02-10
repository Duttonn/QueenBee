import React from 'react';
import { Terminal, Check, X, Shield, ChevronDown, ChevronRight, FileEdit, Loader2, Search, Code, Cpu, ExternalLink } from 'lucide-react';
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

  const getToolAction = () => {
    switch (toolName) {
      case 'write_file': return 'Created';
      case 'replace': return 'Edited';
      case 'read_file': return 'Read';
      case 'list_directory':
      case 'glob':
      case 'search_file_content': return 'Explored';
      case 'run_shell_command': return 'Executed';
      default: return 'Called';
    }
  };

  const getToolIcon = () => {
    switch (toolName) {
      case 'write_file':
      case 'replace': return <FileEdit size={12} className="text-blue-500" />;
      case 'read_file': return <Code size={12} className="text-zinc-400" />;
      case 'list_directory':
      case 'glob':
      case 'search_file_content': return <Search size={12} className="text-amber-500" />;
      case 'run_shell_command': return <Terminal size={12} className="text-emerald-500" />;
      default: return <Cpu size={12} className="text-zinc-400" />;
    }
  };

  const getToolDescription = () => {
    if (!args) return <span className="text-zinc-400 ml-1">{toolName}</span>;
    
    const path = args.file_path || args.path || args.dir_path || '';
    const name = path.split('/').pop() || '';
    if (name) return <span className="text-blue-600 font-bold ml-1">{name}</span>;
    if (args.command) return <span className="text-zinc-600 font-mono ml-1 text-[10px]">{args.command.substring(0, 40)}{args.command.length > 40 ? '...' : ''}</span>;
    if (args.pattern) return <span className="text-zinc-600 font-mono ml-1">"{args.pattern}"</span>;
    return <span className="text-zinc-400 ml-1">{toolName}</span>;
  };

  const isFileTool = toolName === 'write_file' || toolName === 'replace';

  const handleOpenDiff = (e: React.MouseEvent) => {
      e.stopPropagation();
      const path = args.file_path || args.path;
      if (path) {
          window.dispatchEvent(new CustomEvent('OPEN_FILE_DIFF', { detail: { path } }));
      }
  };

  const truncatedArgs = React.useMemo(() => {
      if (!args) return null;
      const copy = { ...args };
      if (copy.content && copy.content.length > 200) {
          copy.content = copy.content.substring(0, 200) + `\n\n... (${copy.content.length - 200} more characters truncated)`;
      }
      return copy;
  }, [args]);

  return (
    <div className={`group border-l-2 pl-4 py-2 my-2 transition-all rounded-r-2xl ${status === 'pending' ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-1 ring-orange-100' : 'border-zinc-100 hover:border-zinc-200'}`}>
      <div className="flex items-center justify-between group/row">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
        >
          <div className="flex-shrink-0 w-5 h-5 rounded-md bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover/row:bg-white group-hover/row:shadow-sm transition-all">
            {status === 'running' ? <Loader2 size={10} className="animate-spin text-blue-500" /> : getToolIcon()}
          </div>
          
          <div className="flex items-center text-[11px] font-medium text-zinc-500 truncate">
            <span>{getToolAction()}</span>
            {getToolDescription()}
            
            <div className={`flex items-center gap-1.5 ml-3 transition-opacity ${status === 'pending' ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}>
                {status === 'success' && <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest"><Check size={10} strokeWidth={3} /> Success</div>}
                {status === 'error' && <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest"><X size={10} strokeWidth={3} /> Failed</div>}
                {status === 'pending' && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse border border-orange-200 shadow-sm"><Shield size={10} strokeWidth={3} /> Action Required</div>}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
              {status === 'success' && isFileTool && (
                  <button 
                    onClick={handleOpenDiff}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                      <ExternalLink size={10} />
                      View Changes
                  </button>
              )}
              <ChevronRight 
                size={12} 
                className={`text-zinc-300 group-hover/row:text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {/* Arguments Block */}
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Tool Payload</span>
                    <span className="font-mono opacity-50">{toolName}</span>
                </div>
                <pre className="text-[10px] text-zinc-600 font-mono overflow-x-auto leading-relaxed max-h-64">
                  {JSON.stringify(truncatedArgs, null, 2)}
                </pre>
              </div>

              {/* Execution Feedback */}
              {status === 'pending' && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl">
                  <button 
                    onClick={onReject}
                    className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={onApprove}
                    className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all shadow-md"
                  >
                    Approve
                  </button>
                </div>
              )}

              {result && (
                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                  <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Result</div>
                  <pre className="text-[10px] text-zinc-600 font-mono overflow-x-auto max-h-40">
                    {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                  <div className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Error</div>
                  <pre className="text-[10px] text-rose-700 font-mono overflow-x-auto">
                    {error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolCallViewer;