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

const MacOSDesktop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(ellipse at 35% 25%, #5b21b6 0%, #2d1b69 30%, #1a0f3d 60%, #05030c 100%)',
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  </AbsoluteFill>
);

// Animating number counter
const Counter: React.FC<{ from: number; to: number; startFrame: number; frame: number }> = ({
  from,
  to,
  startFrame,
  frame,
}) => {
  const val = Math.floor(
    interpolate(frame, [startFrame, startFrame + 35], [from, to], {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  return <>{val}</>;
};

// What the agent has learned over sessions
const directives = [
  { icon: '⚡', text: 'Always use Zod for API input validation' },
  { icon: '🧩', text: 'Prefer functional React components, never class syntax' },
  { icon: '✅', text: 'Write Vitest tests before submitting any PR' },
  { icon: '🌿', text: 'Feature branches off main, squash-merge only' },
  { icon: '🔒', text: 'Never commit .env files — use dotenv-vault' },
];

// Stat card
const StatCard: React.FC<{
  label: string;
  children: React.ReactNode;
  accent: string;
  frame: number;
  delay: number;
}> = ({ label, children, accent, frame, delay }) => {
  const p = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '14px 16px',
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {children}
      </div>
    </div>
  );
};

export const FusionEvolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });

  // "Gen 4" insight card springs in at frame 115
  const insightProg = spring({
    frame: frame - 115,
    fps,
    config: { stiffness: 120, damping: 12 },
  });
  const showInsight = frame >= 115;

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
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, sans-serif',
              position: 'relative',
            }}
          >
            {/* ── Left: stats column ───────────────────────────────────── */}
            <div
              style={{
                width: 220,
                borderRight: '1px solid #e5e7eb',
                background: '#fafafa',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 4,
                  opacity: interpolate(frame, [18, 30], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                This codebase
              </div>

              <StatCard label="Sessions run" accent="#7B4FFF" frame={frame} delay={22}>
                <Counter from={0} to={50} startFrame={22} frame={frame} />
              </StatCard>

              <StatCard label="Memories stored" accent="#3b82f6" frame={frame} delay={34}>
                <Counter from={0} to={247} startFrame={34} frame={frame} />
              </StatCard>

              <StatCard label="Speed gain" accent="#22c55e" frame={frame} delay={46}>
                +<Counter from={0} to={67} startFrame={46} frame={frame} />%
              </StatCard>

              {/* Small sparkline-style improvement bar */}
              <div
                style={{
                  marginTop: 8,
                  opacity: interpolate(frame, [58, 72], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Task duration trend
                </div>
                {/* Simulated bars */}
                {[45, 42, 36, 28, 22, 18, 15, 13].map((val, i) => {
                  const barWidth = interpolate(frame, [62 + i * 4, 74 + i * 4], [0, val], {
                    extrapolateRight: 'clamp',
                  });
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ fontSize: 9, color: '#d1d5db', width: 24, textAlign: 'right', fontFamily: 'SF Mono, monospace' }}>
                        {['W1','W2','W3','W4','W5','W6','W7','W8'][i]}
                      </div>
                      <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(barWidth / 45) * 100}%`,
                            height: '100%',
                            background: i < 3 ? '#ef4444' : i < 6 ? '#f59e0b' : '#22c55e',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 9, color: '#6b7280', width: 24, fontFamily: 'SF Mono, monospace' }}>
                        {val}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right: learned directives ─────────────────────────────── */}
            <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden', position: 'relative' }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 20,
                  opacity: interpolate(frame, [20, 34], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #7B4FFF, #a78bfa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(123,79,255,0.3)',
                  }}
                >
                  🧠
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 1 }}>
                    What I've learned about your codebase
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    Accumulated over 50 sessions · Generation 4 agent
                  </div>
                </div>
                {/* Gen badge */}
                <div
                  style={{
                    marginLeft: 'auto',
                    background: 'linear-gradient(135deg, rgba(123,79,255,0.1), rgba(123,79,255,0.05))',
                    border: '1px solid rgba(123,79,255,0.2)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7B4FFF',
                  }}
                >
                  GEN 4
                </div>
              </div>

              {/* Directive list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {directives.map((d, i) => {
                  const startF = 38 + i * 12;
                  const p = interpolate(frame, [startF, startF + 14], [0, 1], {
                    extrapolateRight: 'clamp',
                  });
                  if (frame < startF) return null;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: i % 2 === 0 ? 'rgba(123,79,255,0.04)' : '#fafafa',
                        border: '1px solid #f0f0f0',
                        borderRadius: 12,
                        opacity: p,
                        transform: `translateX(${interpolate(p, [0, 1], [-16, 0])}px)`,
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{d.icon}</span>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>
                        {d.text}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          color: '#7B4FFF',
                          fontWeight: 700,
                          fontFamily: 'SF Mono, monospace',
                          background: 'rgba(123,79,255,0.08)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        learned
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ── Performance insight card (springs in at f=115) ──────── */}
              {showInsight && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    width: 320,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.11)',
                    padding: '14px 18px',
                    opacity: insightProg,
                    transform: `translateY(${interpolate(insightProg, [0, 1], [20, 0])}px)`,
                    zIndex: 50,
                  }}
                >
                  {/* Traffic lights */}
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                    🐝 QueenBee Agent · Gen 4
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    Auth tasks that took{' '}
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>45 min</span> on day 1 now
                    take{' '}
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>12 min</span>.{' '}
                    I know your patterns cold.
                  </div>
                </div>
              )}
            </div>
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
