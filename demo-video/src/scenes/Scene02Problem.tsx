import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { WorkbenchUI } from '../components/WorkbenchUI';
import { ComposerBarUI } from '../components/ComposerBarUI';
import { TextCallout } from '../components/TextCallout';

export const Scene02Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  const fullText = "The calculateTotal function is ignoring the tax array for regional customers. Please fix it.";
  const typeIndex = Math.min(
    Math.max(0, Math.floor((frame - 30) / 1.5)),
    fullText.length
  );
  
  const typedText = fullText.substring(0, typeIndex);

  return (
    <AbsoluteFill>
      <TextCallout text="Step 1: Point to the issue." position="top" />
      <MacWindow scale={0.85 + windowProgress * 0.05} yOffset={20 * (1 - windowProgress)} opacity={windowProgress}>
        <AppUI activeProjectName="e-commerce-backend">
          <WorkbenchUI>
            {/* Empty workbench state */}
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🐞</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Ready to fix</h2>
              <p className="text-zinc-500 max-w-sm">Describe the bug and QueenBee will spawn a swarm to debug and fix it automatically.</p>
            </div>
          </WorkbenchUI>
          <ComposerBarUI value={typedText} />
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
