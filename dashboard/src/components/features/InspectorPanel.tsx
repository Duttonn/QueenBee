import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, ChevronDown, Layout, Code, Activity, MousePointer2 } from 'lucide-react';

interface InspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ isOpen, onClose }) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Simulated nodes for now, in a real implementation this would fetch from RuntimeBridge
  useEffect(() => {
    if (isOpen) {
      setNodes([
        { id: '1', name: 'App', type: 'component', children: [
          { id: '2', name: 'Header', type: 'component', children: [] },
          { id: '3', name: 'Main', type: 'element', children: [
            { id: '4', name: 'Sidebar', type: 'component', children: [] },
            { id: '5', name: 'Editor', type: 'component', children: [] }
          ]}
        ]}
      ]);
    }
  }, [isOpen]);

  const renderTree = (node: any, depth = 0) => {
    const isExpanded = true; // For now
    return (
      <div key={node.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          onClick={() => setSelectedId(node.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            selectedId === node.id ? 'bg-blue-50 text-blue-600' : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {node.children?.length > 0 ? <ChevronDown size={12} /> : <div className="w-3" />}
          {node.type === 'component' ? <Layout size={12} className="text-purple-500" /> : <Code size={12} className="text-blue-500" />}
          <span>{node.name}</span>
        </button>
        {isExpanded && node.children?.map((child: any) => renderTree(child, depth + 1))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-80 bg-white border-l border-zinc-200 z-[60] shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="h-14 border-b border-zinc-100 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Deep Inspector</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400">
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
              <input
                type="text"
                placeholder="Search components..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto px-2 py-1">
            <div className="mb-2 px-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hierarchy</div>
            {nodes.map(node => renderTree(node))}
          </div>

          {/* Properties */}
          {selectedId && (
            <div className="h-64 border-t border-zinc-100 bg-zinc-50/50 p-4 overflow-y-auto">
              <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Properties</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">className</span>
                  <span className="text-blue-600 font-mono font-bold truncate ml-2">"flex-1 p-4"</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">onClick</span>
                  <span className="text-zinc-400 italic">[Function]</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">isVisible</span>
                  <span className="text-zinc-900 font-bold">true</span>
                </div>
              </div>
              <button className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-all">
                <MousePointer2 size={12} />
                Focus in App
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InspectorPanel;
