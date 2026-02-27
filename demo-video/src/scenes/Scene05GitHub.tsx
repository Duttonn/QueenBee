import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene05GitHub: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Instant Context" subtext="Pick up any project from GitHub." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="project details">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, gap: 32 }}>
            <div style={{ textAlign: 'center', maxWidth: 600 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🐙</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: 0 }}>Clone & Contextualize</h2>
              <p style={{ fontSize: 18, color: '#4b5563', marginTop: 16 }}>Paste a GitHub repo URL. We analyze the codebase, setup the environment, and load architectural context.</p>
            </div>
            <div style={{ display: 'flex', width: '100%', maxWidth: 500, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
              <div style={{ flex: 1, fontSize: 16, color: '#111827', fontFamily: 'monospace' }}>
                https://github.com/facebook/react
              </div>
              <div style={{ padding: '8px 16px', backgroundColor: '#111827', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Import
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {[
                { label: 'Scanning codebase', status: '✅' },
                { label: 'Installing deps', status: '✅' },
                { label: 'Building index', status: '🔄' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', backgroundColor: '#fff', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  <span>{step.status}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
