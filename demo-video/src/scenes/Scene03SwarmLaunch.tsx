import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene03SwarmLaunch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Unleash the Swarm" subtext="3 agents working in parallel." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="agents">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 24, gap: 16 }}>
            {[
              { role: 'Backend Dev', task: 'Implement RESTful endpoints and auth middlewares', progress: 45, color: '#3b82f6' },
              { role: 'Frontend Dev', task: 'Build out React components with TailwindCSS', progress: 60, color: '#f59e0b' },
              { role: 'QA Engineer', task: 'Write Jest integration tests for new endpoints', progress: 20, color: '#10b981' },
            ].map((agent, i) => (
              <div key={i} style={{ padding: 20, backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 12, transform: `translateY(${(1 - Math.min(1, Math.max(0, (frame - 20 * i) / 20))) * 20}px)`, opacity: Math.min(1, Math.max(0, (frame - 15 * i) / 20)) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: agent.color }}>
                    {agent.role}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', padding: '4px 12px', backgroundColor: '#f3f4f6', borderRadius: 999 }}>
                    Running
                  </div>
                </div>
                <div style={{ fontSize: 15, color: '#374151' }}>
                  {agent.task}
                </div>
                <div style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ width: `${agent.progress}%`, height: '100%', backgroundColor: agent.color, transition: 'width 0.2s linear' }} />
                </div>
              </div>
            ))}
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
