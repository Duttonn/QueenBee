import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene08Safety: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Total Control" subtext="Blacklist commands and limit access." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="settings">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, gap: 32 }}>
            <div style={{ textAlign: 'center', maxWidth: 600 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: 0 }}>Command Policy</h2>
              <p style={{ fontSize: 18, color: '#4b5563', marginTop: 16 }}>You are in charge. Define strictly what QueenBee can and cannot execute in your local environment.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 500, padding: 24, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
              {[
                { cmd: 'rm -rf /*', status: 'Blocked', color: '#ef4444' },
                { cmd: 'npm publish', status: 'Require Approval', color: '#f59e0b' },
                { cmd: 'git commit -m', status: 'Allowed', color: '#10b981' },
                { cmd: 'docker rm -f $(docker ps -aq)', status: 'Blocked', color: '#ef4444' },
              ].map((policy, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#374151', fontWeight: 600 }}>{policy.cmd}</div>
                  <div style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: policy.color, backgroundColor: `${policy.color}20` }}>
                    {policy.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
