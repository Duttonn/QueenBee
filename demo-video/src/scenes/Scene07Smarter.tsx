import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene07Smarter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Evolution Directives" subtext="Learns your codebase over time." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="settings">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, gap: 32 }}>
            <div style={{ textAlign: 'center', maxWidth: 600 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: 0 }}>Evolution Score</h2>
              <p style={{ fontSize: 18, color: '#4b5563', marginTop: 16 }}>QueenBee analyzes its own performance after every task. It writes permanent memory blocks to avoid repeating mistakes and learn your project's unique conventions.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 200, gap: 16, width: '100%', maxWidth: 500, padding: 24, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
              {[
                { score: 62, label: 'Session 1' },
                { score: 74, label: 'Session 2' },
                { score: 88, label: 'Session 3' },
              ].map((data, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>{data.score}%</div>
                  <div style={{ width: 60, height: `${data.score}%`, backgroundColor: '#fbbf24', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease-out' }} />
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{data.label}</div>
                </div>
              ))}
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
