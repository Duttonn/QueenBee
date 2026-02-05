import React, { useState } from 'react';
import { 
  GitCommit, 
  GitPullRequest, 
  Check, 
  ArrowRight,
  Split,
  Maximize2
} from 'lucide-react';
import DiffViewer from './DiffViewer';

const ReviewAndShip = () => {
  const [selectedFile, setSelectedFile] = useState('Sidebar.tsx');

  return (
    <div className="flex h-full bg-[#0d0d0d]">
      
      {/* 5.3 Commit Controls (Left Pane) */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-[#111]">
        <div className="p-4 border-b border-gray-800">
           <h2 className="text-sm font-bold text-white flex items-center gap-2">
             <GitCommit size={16} className="text-blue-500" />
             Review & Ship
           </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Staged Changes</div>
           <FileItem name="Sidebar.tsx" status="M" active={selectedFile === 'Sidebar.tsx'} onClick={() => setSelectedFile('Sidebar.tsx')} />
           <FileItem name="AgenticWorkbench.tsx" status="A" active={selectedFile === 'AgenticWorkbench.tsx'} onClick={() => setSelectedFile('AgenticWorkbench.tsx')} />
           
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-6 mb-2 px-2">Changes</div>
           <FileItem name="CodexLayout.tsx" status="M" active={false} />
        </div>

        <div className="p-4 bg-[#1a1a1a] border-t border-gray-800 space-y-3">
           <div>
             <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Commit Message</label>
             <textarea 
               className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg p-2 text-xs text-white h-20 outline-none focus:border-blue-500"
               defaultValue="feat(ui): implement Hive Sidebar and Agentic Workbench"
             />
           </div>
           <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
             Commit & Push
           </button>
        </div>
      </div>

      {/* 5.1 & 5.2 Main Review Area */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
         
         {/* Toolbar */}
         <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-[#252526]">
            <div className="flex items-center gap-2 text-xs text-gray-400">
               <span className="font-mono text-white">{selectedFile}</span>
               <span className="bg-gray-700 px-1.5 rounded text-[10px]">Diff</span>
            </div>
            <div className="flex items-center gap-2">
               <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400" title="Split View">
                  <Split size={14} />
               </button>
               <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400" title="Full Screen">
                  <Maximize2 size={14} />
               </button>
            </div>
         </div>

         {/* Queen Bee Summary Banner */}
         <div className="bg-blue-500/5 border-b border-blue-500/10 p-4">
            <div className="flex gap-3">
               <div className="text-2xl">👑🐝</div>
               <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Intent Analysis</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                     This change introduces the <strong>Sidebar</strong> component to navigate the workspace structure and adds the <strong>AgenticWorkbench</strong> for chat interactions. It aligns with the PRD sections 2.2 and 3.
                  </p>
               </div>
            </div>
         </div>

         {/* Diff Viewer */}
         <div className="flex-1 overflow-auto p-8 flex justify-center bg-[#0d0d0d]">
             <DiffViewer />
         </div>

         {/* PR Intelligence Footer */}
         <div className="h-12 bg-[#1a1a1a] border-t border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check size={14} />
                  <span>CI Checks Passed</span>
               </div>
               <div className="h-4 w-[1px] bg-gray-700"></div>
               <div className="flex items-center gap-2 text-xs text-gray-400">
                  <GitPullRequest size={14} />
                  <span>PR #42: Draft</span>
               </div>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 px-4 py-1.5 rounded-lg transition-colors">
               <span>Create Pull Request</span>
               <ArrowRight size={14} />
            </button>
         </div>

      </div>
    </div>
  );
};

const FileItem = ({ name, status, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-3 py-1.5 rounded cursor-pointer mb-0.5 group ${active ? 'bg-blue-600/20 text-blue-200' : 'hover:bg-gray-800 text-gray-400'}`}
  >
    <div className="flex items-center gap-2">
      <span className="text-xs">{name}</span>
    </div>
    <span className={`text-[10px] font-mono w-4 text-center ${status === 'M' ? 'text-yellow-400' : 'text-green-400'}`}>
      {status}
    </span>
  </div>
);

export default ReviewAndShip;
