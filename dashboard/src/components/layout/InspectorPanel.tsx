import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Crosshair, Code, ChevronRight, ChevronDown, Activity, Zap } from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';

interface ComponentNode {
  id: string;
  name: string;
  source?: {
    file: string;
    line: number;
  };
  children?: ComponentNode[];
}

const InspectorPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { socket } = useHiveStore();
  const [componentTree, setComponentTree] = useState<ComponentNode[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ComponentNode | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('RUNTIME_RESPONSE_RELAY', (data) => {
      if (data.action === 'SOURCE_MAPPING' && data.found) {
        setSelectedNode({
          id: data.id,
          name: data.id.split('-')[0] || 'Component',
          source: data.source
        });
      }
    });

    return () => {
      socket.off('RUNTIME_RESPONSE_RELAY');
    };
  }, [socket]);

  const handlePick = () => {
    setIsPicking(!isPicking);
    // In a real implementation, this would activate a "pick" mode in the target app
    console.log('[Inspector] Toggle element picker');
  };

  const executeAction = (action: string, id: string) => {
    socket?.emit('RUNTIME_EXEC', { action, id });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-zinc-200 shadow-2xl z-[60] flex flex-col"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Deep Inspector</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded text-zinc-400">
              <Activity size={16} />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-100 space-y-4">
            <button
              onClick={handlePick}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isPicking 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Crosshair size={14} />
              {isPicking ? 'Picking...' : 'Inspect Element'}
            </button>

            {selectedNode && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-100 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Selected</span>
                  <button onClick={() => setSelectedNode(null)} className="text-blue-400 hover:text-blue-600">
                    <Zap size={12} />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">{selectedNode.name}</h3>
                {selectedNode.source && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                    <Code size={12} />
                    <span>{selectedNode.source.file}:{selectedNode.source.line}</span>
                  </div>
                )}
                
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => executeAction('CLICK', selectedNode.id)}
                    className="flex-1 py-1.5 bg-white border border-blue-200 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    Test Click
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Component Tree</div>
            
            {!selectedNode && componentTree.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
                  <Layers size={24} className="text-zinc-200" />
                </div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                  Inspector Not Connected
                </p>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Start your application with the Queen Bee Dev Server to enable live component inspection.
                </p>
                <div className="mt-6 p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-left w-full">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">How to connect:</div>
                  <code className="text-[9px] text-blue-600 font-mono">
                    npm install @queen-bee/bridge<br/>
                    import '@queen-bee/bridge/register'
                  </code>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {componentTree.map(node => (
                  <TreeItem key={node.id} name={node.name} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TreeItem = ({ name, active = false }: { name: string; active?: boolean }) => (
  <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
    active ? 'bg-blue-50 text-blue-600' : 'text-zinc-600 hover:bg-zinc-100'
  }`}>
    <ChevronRight size={12} className={active ? 'text-blue-400' : 'text-zinc-400'} />
    <span className="text-[12px] font-semibold">{name}</span>
  </div>
);

export default InspectorPanel;
