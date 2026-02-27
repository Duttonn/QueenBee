import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene06GitPR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="Ship It" subtext="Commits & Pull Requests automated." position="top" />
      <MacWindow scale={0.9} opacity={windowProgress}>
        <AppUI activeTab="worktrees">
          <div style={{ display: 'flex', height: '100%', padding: 24, gap: 24 }}>
            <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderTopLeftRadius: 8, borderTopRightRadius: 8, fontWeight: 600, color: '#4b5563', display: 'flex', justifyContent: 'space-between' }}>
                <div>Git Diff</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 700 }}>+42</div>
                  <div style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 700 }}>-12</div>
                </div>
              </div>
              <div style={{ padding: 16, flex: 1, color: '#374151', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, overflow: 'auto' }}>
                <div style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '0 8px', margin: '4px 0' }}>+ export const calculateTotal = (items) =&gt; {'{'}</div>
                <div style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '0 8px', margin: '4px 0' }}>+   return items.reduce((sum, item) =&gt; sum + item.price, 0);</div>
                <div style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '0 8px', margin: '4px 0' }}>+ {'}'};</div>
                <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '0 8px', margin: '4px 0', textDecoration: 'line-through' }}>- // TODO: Implement calculateTotal</div>
              </div>
            </div>
            <div style={{ width: 320, backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderTopLeftRadius: 8, borderTopRightRadius: 8, fontWeight: 600, color: '#4b5563' }}>
                Commit & PR
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Commit Message</label>
                  <textarea defaultValue="feat: implement calculateTotal function" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'monospace', resize: 'vertical', minHeight: 60 }} />
                </div>
                <button style={{ width: '100%', padding: '10px 16px', backgroundColor: '#111827', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none' }}>Commit & Push</button>
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                <button style={{ width: '100%', padding: '10px 16px', backgroundColor: '#fff', color: '#111827', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: '1px solid #d1d5db' }}>Create Pull Request</button>
              </div>
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
