import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { WorkbenchUI } from '../components/WorkbenchUI';
import { ComposerBarUI } from '../components/ComposerBarUI';
import { TextCallout } from '../components/TextCallout';
import { Bot, CheckCircle2, Loader2, Sparkles, User } from 'lucide-react';

export const Scene03Swarm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  const fullText = "The calculateTotal function is ignoring the tax array for regional customers. Please fix it.";

  const steps = [
    { label: "Analyze requirements", delay: 20 },
    { label: "Check tax schemas", delay: 50 },
    { label: "Apply regional fix", delay: 80 },
    { label: "Run Jest suite", delay: 120 }
  ];

  const RightPanel = (
    <div className="flex-1 flex flex-col p-4 bg-white/50 backdrop-blur-sm shadow-inner rounded-l-2xl border-l border-zinc-200">
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2 flex items-center justify-between">
        Agent Trace
        <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Swarm Active</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isActive = frame >= step.delay && (i === steps.length - 1 || frame < steps[i + 1].delay);
          const isDone = i < steps.length - 1 && frame >= steps[i + 1].delay;
          const isPending = frame < step.delay;

          if (isPending) return null;

          return (
            <div key={i} className={`p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-white border-blue-200 shadow-md scale-100 opacity-100' : isDone ? 'bg-zinc-50 border-zinc-200 opacity-60' : 'hidden'}`}>
              <div className="flex items-center gap-3">
                {isActive ? (
                  <Loader2 size={18} className="text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle2 size={18} className="text-green-500" />
                )}
                <span className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-zinc-600 line-through'}`}>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <TextCallout text="Step 2: The Swarm takes over." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeProjectName="e-commerce-backend">
          <WorkbenchUI rightPanel={RightPanel}>
            {/* Chat History */}
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-zinc-500" />
              </div>
              <div className="bg-zinc-100 text-zinc-900 rounded-2xl rounded-tl-sm px-5 py-3 text-sm font-medium">
                {fullText}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot size={16} className="text-amber-600" />
              </div>
              <div className="bg-white border border-zinc-200 shadow-sm text-zinc-900 rounded-2xl rounded-tl-sm px-5 py-4 text-sm max-w-lg space-y-3">
                <p className="font-medium text-zinc-700">I'm setting up a swarm to resolve this.</p>
                <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="text-amber-500">▶</span> Spawning Debugger Agent
                  </div>
                  {frame > 60 && (
                    <div className="flex items-center gap-2 text-zinc-600">
                      <span className="text-blue-500">▶</span> Spawning QA Agent
                    </div>
                  )}
                  {frame > 100 && (
                    <div className="flex items-center gap-2 text-zinc-600 text-green-600">
                      <span className="text-green-500">✔</span> Fix identified in <span className="font-bold bg-white px-1 border border-zinc-200 rounded">src/utils/pricing.ts</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </WorkbenchUI>
          <ComposerBarUI isGenerating={true} />
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
