import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene02AppOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="A true collaborative workspace" subtext="Not just a text box." position="top" />
      <MacWindow scale={0.85 + windowProgress * 0.05} yOffset={20 * (1 - windowProgress)} opacity={windowProgress}>
        <AppUI activeTab="project details">
          <div style={{ display: 'flex', height: '100%', padding: 24, gap: 24 }}>
            {/* Main Chat/Editor Area */}
            <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderTopLeftRadius: 8, borderTopRightRadius: 8, fontWeight: 600, color: '#4b5563' }}>
                Objective
              </div>
              <div style={{ padding: 16, flex: 1, color: '#374151', fontSize: 15, lineHeight: 1.6 }}>
                &gt; Build a dashboard to visualize user metrics with real-time updates.
              </div>
            </div>
            {/* Right Panel: Agent Steps */}
            <div style={{ width: 320, backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderTopLeftRadius: 8, borderTopRightRadius: 8, fontWeight: 600, color: '#4b5563' }}>
                Agent Trace
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { text: 'Analyze requirements', status: '✅' },
                  { text: 'Design architecture', status: '✅' },
                  { text: 'Implement backend API', status: '🔄' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <span>{step.status}</span>
                    <span style={{ color: step.status === '✅' ? '#9ca3af' : '#111827', textDecoration: step.status === '✅' ? 'line-through' : 'none' }}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
