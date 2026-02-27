import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';

const MacOSDesktop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(ellipse at 35% 25%, #5b21b6 0%, #2d1b69 30%, #1a0f3d 60%, #05030c 100%)',
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  </AbsoluteFill>
);

export const FusionSafety: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });

  // Warning card springs in at frame 40
  const warnProg = spring({
    frame: frame - 40,
    fps,
    config: { stiffness: 100, damping: 11 },
  });
  // Approval card springs in at frame 95
  const approvalProg = spring({
    frame: frame - 95,
    fps,
    config: { stiffness: 120, damping: 13 },
  });

  // Agent trace steps
  const agentSteps = [
    { text: 'Read src/deploy/config.ts', done: true },
    { text: 'Validate environment variables', done: true },
    { text: 'Preparing deploy script', done: true },
    { text: 'Running: git push origin main --force', done: false, blocked: true },
  ];

  return (
    <AbsoluteFill>
      <MacOSDesktop />
      <MacWindow
        scale={interpolate(winProg, [0, 1], [0.92, 1])}
        yOffset={interpolate(winProg, [0, 1], [40, 0])}
        opacity={winProg}
      >
        <AppUI activeProjectName="e-commerce">
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, sans-serif',
              position: 'relative',
            }}
          >
            {/* Agent trace */}
            <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 14,
                }}
              >
                Agent Trace — Deploy task
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agentSteps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: s.blocked
                        ? 'rgba(239,68,68,0.06)'
                        : s.done
                        ? 'transparent'
                        : '#fff',
                      border: s.blocked
                        ? '1px solid rgba(239,68,68,0.2)'
                        : s.done
                        ? '1px solid transparent'
                        : '1px solid #e5e7eb',
                      opacity: interpolate(
                        frame,
                        [i * 8 + 5, i * 8 + 18],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: s.blocked
                          ? 'rgba(239,68,68,0.15)'
                          : s.done
                          ? 'rgba(34,197,94,0.15)'
                          : 'rgba(123,79,255,0.15)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: s.blocked ? '#ef4444' : s.done ? '#22c55e' : '#7B4FFF',
                        flexShrink: 0,
                      }}
                    >
                      {s.blocked ? '⊘' : s.done ? '✓' : '↻'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'SF Mono, Fira Code, monospace',
                        fontSize: 12,
                        color: s.blocked ? '#ef4444' : s.done ? '#9ca3af' : '#111',
                        fontWeight: s.blocked ? 600 : 400,
                        textDecoration: s.done && !s.blocked ? 'line-through' : 'none',
                      }}
                    >
                      {s.text}
                    </span>
                    {s.blocked && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239,68,68,0.1)',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        BLOCKED
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Policy violation warning */}
              {frame >= 40 && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '14px 16px',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 14,
                    opacity: warnProg,
                    transform: `translateY(${interpolate(warnProg, [0, 1], [16, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#9a3412',
                          marginBottom: 4,
                        }}
                      >
                        Restricted command detected
                      </div>
                      <div
                        style={{
                          fontFamily: 'SF Mono, Fira Code, monospace',
                          fontSize: 12,
                          color: '#c2410c',
                          background: 'rgba(239,68,68,0.08)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          marginBottom: 6,
                          display: 'inline-block',
                        }}
                      >
                        git push origin main --force
                      </div>
                      <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                        This command is on your policy blocklist. Pausing execution and
                        notifying Slack for approval.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slack approval card — springs in from bottom-right (Codex notification style) */}
            {frame >= 95 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  right: 24,
                  width: 340,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                  padding: '14px 16px',
                  opacity: approvalProg,
                  transform: `translateY(${interpolate(approvalProg, [0, 1], [24, 0])}px)`,
                  zIndex: 100,
                }}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
                    <div
                      key={c}
                      style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#4A154B"/>
                    </svg>
                  </span>
                  <div
                    style={{ fontSize: 12, fontWeight: 700, color: '#111' }}
                  >
                    QueenBee approval request
                  </div>
                </div>
                <div
                  style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 12 }}
                >
                  Agent wants to run{' '}
                  <code
                    style={{
                      background: '#f3f4f6',
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    git push --force
                  </code>{' '}
                  on <strong>main</strong>. Approve?
                </div>
                {frame >= 115 && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 10,
                      fontSize: 12,
                      color: '#15803d',
                      fontWeight: 600,
                      opacity: interpolate(frame, [115, 126], [0, 1], {
                        extrapolateRight: 'clamp',
                      }),
                    }}
                  >
                    ✓ Approved by @nathanael · Agent resuming
                  </div>
                )}
              </div>
            )}
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
