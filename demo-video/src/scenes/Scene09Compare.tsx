import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene09Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="The New Standard" subtext="Built for local workflows." position="top" delay={15} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${0.9 + progress * 0.1}) translateY(${(1 - progress) * 20}px)`,
          opacity: progress,
        }}
      >
        <div style={{ width: 1000, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 40px 80px rgba(0, 0, 0, 0.4)', overflow: 'hidden', padding: 40 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'system-ui, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '16px 24px', fontSize: 18, color: '#4b5563', fontWeight: 600 }}>Feature</th>
                <th style={{ padding: '16px 24px', fontSize: 24, color: '#fbbf24', fontWeight: 800 }}>QueenBee</th>
                <th style={{ padding: '16px 24px', fontSize: 18, color: '#9ca3af', fontWeight: 500 }}>Codex</th>
                <th style={{ padding: '16px 24px', fontSize: 18, color: '#9ca3af', fontWeight: 500 }}>Cursor</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Swarms (Parallel Agents)', qb: '✅ Yes (Local)', cd: '❌ No', cr: '❌ No' },
                { feature: 'Evolution Directives (Memory)', qb: '✅ Persistent', cd: '❌ Session only', cr: '❌ No' },
                { feature: 'Internet Access / Fetch Docs', qb: '✅ Yes', cd: '❌ Disabled', cr: '✅ Yes' },
                { feature: 'Local First (No Cloud Lock-in)', qb: '✅ Yes', cd: '❌ Cloud Only', cr: '❌ Hybrid' },
                { feature: 'Customizable Agent Logic', qb: '✅ Full Control', cd: '❌ No', cr: '❌ No' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: i % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                  <td style={{ padding: '16px 24px', fontSize: 16, color: '#111827', fontWeight: 600 }}>{row.feature}</td>
                  <td style={{ padding: '16px 24px', fontSize: 16, color: '#10b981', fontWeight: 700 }}>{row.qb}</td>
                  <td style={{ padding: '16px 24px', fontSize: 16, color: '#6b7280', fontWeight: 500 }}>{row.cd}</td>
                  <td style={{ padding: '16px 24px', fontSize: 16, color: '#6b7280', fontWeight: 500 }}>{row.cr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
