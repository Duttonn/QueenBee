import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { WorkbenchUI } from '../components/WorkbenchUI';
import { ComposerBarUI } from '../components/ComposerBarUI';
import { TextCallout } from '../components/TextCallout';
import { X, GitCommit, FileCode2 } from 'lucide-react';

export const Scene04Diff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  const fullText = "The calculateTotal function is ignoring the tax array for regional customers. Please fix it.";

  return (
    <AbsoluteFill>
      <TextCallout text="Step 3: Review and commit." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeProjectName="e-commerce-backend">
          <WorkbenchUI>
            {/* Diff Viewer Overlay (Mimicking the isDiffOpen state) */}
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md z-50 flex items-center justify-center p-8">
              <div className="bg-white w-full max-w-4xl h-full max-h-[600px] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative border border-zinc-200">
                <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 bg-zinc-50/50">
                  <div className="flex items-center gap-4">
                    <FileCode2 size={20} className="text-blue-500" />
                    <div>
                      <h3 className="font-bold text-zinc-900 text-sm">src/utils/pricing.ts</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider">
                          +2
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                          -1
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-[#fafafa] font-mono text-[13px] leading-relaxed p-4 selection:bg-blue-200">
                  <div className="flex group text-zinc-400">
                    <div className="w-12 text-right pr-4 select-none">42</div>
                    <div className="w-12 text-right pr-4 select-none">42</div>
                    <div className="flex-1 pl-4 border-l border-zinc-200 whitespace-pre">  const baseTotal = items.reduce((sum, item) =&gt; sum + item.price, 0);</div>
                  </div>
                  <div className="flex group text-zinc-400 bg-red-50 text-red-800">
                    <div className="w-12 text-right pr-4 select-none bg-red-100/50 text-red-400">43</div>
                    <div className="w-12 text-right pr-4 select-none bg-red-100/50"></div>
                    <div className="flex-1 pl-4 border-l border-red-200 whitespace-pre">  <span className="line-through opacity-70">- return baseTotal * (1 + defaultTaxRate);</span></div>
                  </div>
                  <div className="flex group text-zinc-400 bg-green-50 text-green-900">
                    <div className="w-12 text-right pr-4 select-none bg-green-100/50"></div>
                    <div className="w-12 text-right pr-4 select-none bg-green-100/50 text-green-500">43</div>
                    <div className="flex-1 pl-4 border-l border-green-300 whitespace-pre font-semibold">  <span className="text-green-600">+ const regionalTax = user.region ? regionalRates[user.region] : defaultTaxRate;</span></div>
                  </div>
                  <div className="flex group text-zinc-400 bg-green-50 text-green-900">
                    <div className="w-12 text-right pr-4 select-none bg-green-100/50"></div>
                    <div className="w-12 text-right pr-4 select-none bg-green-100/50 text-green-500">44</div>
                    <div className="flex-1 pl-4 border-l border-green-300 whitespace-pre font-semibold">  <span className="text-green-600">+ return baseTotal * (1 + regionalTax);</span></div>
                  </div>
                  <div className="flex group text-zinc-400">
                    <div className="w-12 text-right pr-4 select-none">44</div>
                    <div className="w-12 text-right pr-4 select-none">45</div>
                    <div className="flex-1 pl-4 border-l border-zinc-200 whitespace-pre">{'}'}</div>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                  <div className="flex-1 max-w-lg relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <GitCommit size={16} />
                    </div>
                    <input type="text" className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value="fix: calculateTotal regional tax handling" readOnly />
                  </div>
                  <button className="px-6 py-2.5 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md active:scale-95">
                    Commit & Push
                  </button>
                </div>
              </div>
            </div>
          </WorkbenchUI>
          <ComposerBarUI />
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
