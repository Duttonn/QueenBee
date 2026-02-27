import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { ComposerBarUI } from '../components/ComposerBarUI';

// ─── Shared desktop background ────────────────────────────────────────────────
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
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  </AbsoluteFill>
);

// ─── Home screen ("Let's build X") ───────────────────────────────────────────
const HomeScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  
  // Using spring physics for organic motion
  const iconProg = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const headProg = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 90 } });
  const cardProg = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 80 } });

  const cards = [
    { icon: '⚡', label: 'Ship a new feature' },
    { icon: '🐛', label: 'Debug a production issue' },
    { icon: '🌙', label: 'Run overnight agents' },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'Inter, -apple-system, sans-serif',
        paddingBottom: 100,
      }}
    >
      {/* Bee icon */}
      <div
        style={{
          fontSize: 52,
          opacity: iconProg,
          transform: `scale(${0.6 + iconProg * 0.4})`,
        }}
      >
        🐝
      </div>

      {/* Heading */}
      <div
        style={{
          textAlign: 'center',
          opacity: headProg,
          transform: `translateY(${interpolate(headProg, [0, 1], [16, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 36, color: '#9ca3af', fontWeight: 400 }}>Let's build</div>
        <div
          style={{
            fontSize: 46,
            color: '#111827',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'center',
          }}
        >
          e-commerce
          <span style={{ color: '#9ca3af', fontSize: 34 }}> ▾</span>
        </div>
      </div>

      {/* Suggestion cards with staggered spring animations */}
      <div style={{ display: 'flex', gap: 15 }}>
        {cards.map((c, i) => {
          const cardDelay = i * 10; // stagger by 10 frames
          const cardProg = spring({ 
            frame: frame - cardDelay, 
            fps, 
            config: { damping: 12, stiffness: 80 } 
          });
          return (
            <div
              key={i}
              style={{
                padding: '14px 22px',
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                fontSize: 16,
                color: '#374151',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: cardProg,
                transform: `translateY(${(1 - cardProg) * 20}px)`,
              }}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Agent step item ─────────────────────────────────────────────────────────
const AgentStep: React.FC<{
  text: string;
  status: 'done' | 'running' | 'pending';
  frame: number;
  startFrame: number;
}> = ({ text, status, frame, startFrame }) => {
  const { fps } = useVideoConfig();
  
  // Spring physics with staggered delay for organic motion
  const prog = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  if (frame < startFrame) return null;

  const statusColor =
    status === 'done' ? '#22c55e' : status === 'running' ? '#7B4FFF' : '#9ca3af';
  const icon = status === 'done' ? '✓' : status === 'running' ? '↻' : '○';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 0',
        opacity: prog,
        transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
        fontFamily: 'SF Mono, Fira Code, monospace',
        fontSize: 14,
      }}
    >
      <span style={{ color: statusColor, width: 16, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          color: status === 'done' ? '#9ca3af' : '#1f2937',
          textDecoration: status === 'done' ? 'line-through' : 'none',
          fontWeight: status === 'running' ? 600 : 400,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ─── Worktree bottom bar ──────────────────────────────────────────────────────
const WorktreeBar: React.FC<{ branch: string; progress: number; color: string }> = ({
  branch,
  progress,
  color,
}) => (
  <div
    style={{
      height: 28,
      background: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 8,
      fontSize: 10,
      color: '#6b7280',
      fontFamily: 'SF Mono, Fira Code, monospace',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
      }}
    />
    <span>{branch}</span>
    <span style={{ marginLeft: 'auto', color, fontWeight: 600 }}>{progress}%</span>
  </div>
);

// ─── Parallel split panel ─────────────────────────────────────────────────────
const ParallelSplitView: React.FC<{ frame: number }> = ({ frame }) => {
  // Frames are relative to when this view appears (around f=120)
  const alphaSteps = [
    { text: 'Analyze requirements', status: 'done' as const, startFrame: 0 },
    { text: 'Design service schema', status: 'done' as const, startFrame: 15 },
    { text: 'Implement auth endpoints', status: 'running' as const, startFrame: 30 },
    { text: 'Write Jest tests', status: 'pending' as const, startFrame: 60 },
    { text: 'Update API docs', status: 'pending' as const, startFrame: 60 },
  ];
  const betaSteps = [
    { text: 'Analyze requirements', status: 'done' as const, startFrame: 5 },
    { text: 'Scaffold component tree', status: 'done' as const, startFrame: 20 },
    { text: 'Build payment form UI', status: 'running' as const, startFrame: 38 },
    { text: 'Add Stripe integration', status: 'pending' as const, startFrame: 60 },
    { text: 'Write Cypress tests', status: 'pending' as const, startFrame: 60 },
  ];

  const alphaProgress = Math.min(51, Math.round(frame * 0.34));
  const betaProgress = Math.min(37, Math.round(frame * 0.25));

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Agent α */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #f0f0f0',
            background: 'rgba(123,79,255,0.04)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#7B4FFF',
                display: 'inline-block',
                boxShadow: '0 0 6px #7B4FFF',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#7B4FFF',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Agent α
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#9ca3af',
                fontFamily: 'SF Mono, Fira Code, monospace',
              }}
            >
              feature/auth-service
            </span>
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
          {alphaSteps.map((s, i) => (
            <AgentStep key={i} {...s} frame={frame} />
          ))}
          {frame > 35 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(123,79,255,0.06)',
                borderRadius: 8,
                border: '1px solid rgba(123,79,255,0.15)',
                fontSize: 11,
                fontFamily: 'SF Mono, Fira Code, monospace',
                color: '#6b7280',
                opacity: interpolate(frame, [35, 48], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <span style={{ color: '#7B4FFF' }}>▶</span> Writing{' '}
              <span style={{ color: '#111' }}>src/auth/service.ts</span>
            </div>
          )}
        </div>
        <WorktreeBar branch="feature/auth-service" progress={alphaProgress} color="#7B4FFF" />
      </div>

      {/* Agent β */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #f0f0f0',
            background: 'rgba(255,22,84,0.03)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FF1654',
                display: 'inline-block',
                boxShadow: '0 0 6px #FF1654',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#FF1654',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Agent β
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#9ca3af',
                fontFamily: 'SF Mono, Fira Code, monospace',
              }}
            >
              feature/payment-module
            </span>
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
          {betaSteps.map((s, i) => (
            <AgentStep key={i} {...s} frame={frame} />
          ))}
          {frame > 42 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(255,22,84,0.05)',
                borderRadius: 8,
                border: '1px solid rgba(255,22,84,0.15)',
                fontSize: 11,
                fontFamily: 'SF Mono, Fira Code, monospace',
                color: '#6b7280',
                opacity: interpolate(frame, [42, 55], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <span style={{ color: '#FF1654' }}>▶</span> Building{' '}
              <span style={{ color: '#111' }}>src/payments/CheckoutForm.tsx</span>
            </div>
          )}
        </div>
        <WorktreeBar branch="feature/payment-module" progress={betaProgress} color="#FF1654" />
      </div>
    </div>
  );
};

// ─── Completion notification (Codex floating card style) ──────────────────────
const CompletionCard: React.FC<{ frame: number; startFrame: number }> = ({
  frame,
  startFrame,
}) => {
  const { fps } = useVideoConfig();
  const prog = spring({
    frame: frame - startFrame,
    fps,
    config: { stiffness: 120, damping: 12, mass: 0.8 },
  });
  if (frame < startFrame) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        right: 24,
        width: 320,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        padding: '14px 16px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        opacity: prog,
        transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
          <div
            key={c}
            style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
          />
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>
        Swarm complete — 2 branches ready
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
        Auth service: 8 files changed.{' '}
        <span style={{ color: '#22c55e', fontWeight: 600 }}>+234 lines</span>
        <br />
        Payment module: 5 files changed.{' '}
        <span style={{ color: '#22c55e', fontWeight: 600 }}>+187 lines</span>
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          style={{
            flex: 1,
            padding: '7px 0',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Review & Merge
        </button>
        <button
          style={{
            padding: '7px 14px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open PRs
        </button>
      </div>
    </div>
  );
};

// ─── Main scene ───────────────────────────────────────────────────────────────
export const FusionParallel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Window entrance
  const winProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const winScale = interpolate(winProg, [0, 1], [0.92, 1]);
  const winY = interpolate(winProg, [0, 1], [40, 0]);
  const winOpacity = winProg;

  // Typing: starts at frame 45, ends at frame 95
  const fullText =
    'Build the auth service and the payment module simultaneously — separate branches, full parallel.';
  const typeIdx = Math.floor(
    interpolate(frame, [45, 100], [0, fullText.length], { extrapolateRight: 'clamp' })
  );
  const typedText = fullText.slice(0, typeIdx);

  // Show plan approval at frame 105
  const showPlan = frame >= 105;
  // Show split agents view at frame 130
  const showAgents = frame >= 130;
  // Show completion card at frame 225
  const showCompletion = frame >= 225;

  // The internal "frame" for the agents panel (resets to 0 when agents appear)
  const agentFrame = Math.max(0, frame - 130);

  return (
    <AbsoluteFill>
      <MacOSDesktop />
      <MacWindow scale={winScale} yOffset={winY} opacity={winOpacity}>
        <AppUI activeProjectName="e-commerce">
          {showAgents ? (
            // ── Agents running: split view ──
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Chat context header */}
              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fafafa',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    fontFamily: 'Inter, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(123,79,255,0.1)',
                      color: '#7B4FFF',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    ⚡ Swarm Active
                  </span>
                  <span>2 agents · 2 branches · running in parallel</span>
                </div>
              </div>

              <ParallelSplitView frame={agentFrame} />

              {/* Completion notification */}
              {showCompletion && (
                <CompletionCard frame={frame} startFrame={225} />
              )}
            </div>
          ) : (
            // ── Home screen or typing ──
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {!showPlan && frame < 45 ? (
                <HomeScreen frame={frame} />
              ) : !showPlan ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 24,
                    paddingBottom: 120,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div style={{ fontSize: 44 }}>🐝</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 30, color: '#9ca3af', fontWeight: 400 }}>
                      Let's build
                    </div>
                    <div
                      style={{
                        fontSize: 38,
                        color: '#111827',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        justifyContent: 'center',
                      }}
                    >
                      e-commerce
                      <span style={{ color: '#9ca3af', fontSize: 28 }}> ▾</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Plan approval banner
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 24,
                    paddingBottom: 120,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div style={{ fontSize: 44 }}>🐝</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 30, color: '#9ca3af' }}>Let's build</div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: '#111827' }}>
                      e-commerce ▾
                    </div>
                  </div>
                  {/* Plan card */}
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 16,
                      padding: '16px 20px',
                      maxWidth: 560,
                      width: '100%',
                      opacity: interpolate(frame, [105, 118], [0, 1], {
                        extrapolateRight: 'clamp',
                      }),
                      transform: `translateY(${interpolate(
                        frame,
                        [105, 118],
                        [16, 0],
                        { extrapolateRight: 'clamp' }
                      )}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#92400e',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 8,
                      }}
                    >
                      ⚡ Architect Plan Ready
                    </div>
                    <div
                      style={{ fontSize: 13, color: '#78350f', marginBottom: 12, lineHeight: 1.5 }}
                    >
                      Spinning up{' '}
                      <strong style={{ color: '#7B4FFF' }}>Agent α → feature/auth-service</strong>{' '}
                      and{' '}
                      <strong style={{ color: '#FF1654' }}>
                        Agent β → feature/payment-module
                      </strong>{' '}
                      simultaneously.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div
                        style={{
                          padding: '7px 18px',
                          background: '#111',
                          color: '#fff',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ▶ Approve & Launch
                      </div>
                      <div
                        style={{
                          padding: '7px 14px',
                          background: '#f3f4f6',
                          color: '#374151',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Revise
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Composer */}
              <ComposerBarUI
                value={typedText}
                showPlanApproval={showPlan && !showAgents}
              />
            </div>
          )}
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
