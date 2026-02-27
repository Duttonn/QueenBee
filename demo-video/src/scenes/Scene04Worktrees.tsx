import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene04Worktrees: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Simultaneous Worktrees" subtext="Multiple features without conflict." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="worktrees">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: '100%', padding: 24, gap: 24 }}>
            {[
              { id: 'wt-auth-12x', branch: 'feature/oauth-login', path: '/worktrees/auth' },
              { id: 'wt-ui-93a', branch: 'fix/dashboard-layout', path: '/worktrees/ui' },
              { id: 'wt-db-82b', branch: 'chore/index-optimizations', path: '/worktrees/db' },
            ].map((wt, i) => (
              <div key={i} style={{ padding: 20, backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    {wt.id}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', padding: '4px 8px', backgroundColor: '#d1fae5', borderRadius: 6 }}>
                    Active
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4b5563' }}>
                  <span style={{ fontSize: 16 }}>⎇</span>
                  <span style={{ fontFamily: 'monospace' }}>{wt.branch}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                  <span>📂</span>
                  <span>{wt.path}</span>
                </div>
              </div>
            ))}
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
