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
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  </AbsoluteFill>
);

// Animated counter (counts from 0 to target)
const Counter: React.FC<{ value: number; frame: number; startFrame: number }> = ({
  value,
  frame,
  startFrame,
}) => {
  const displayed = Math.floor(
    interpolate(frame, [startFrame, startFrame + 40], [0, value], {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateRight: 'clamp',
    })
  );
  return <>{displayed}</>;
};

export const FusionMemory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });

  const memories = [
    '✓  Uses TypeScript strict mode across the board',
    '✓  Zod schemas for all API input validation',
    '✓  Vitest + Testing Library for unit tests',
    '✓  Feature branches off main, squash-merge PRs',
    '✓  Prefers functional components, no class syntax',
  ];

  // Streaming agent message
  const agentMsg =
    "I'm loading context from 8 previous sessions. I can see you use Zod for validation, strict TypeScript, and always write Vitest tests. Continuing from Tuesday's auth work — I'll follow the same patterns.";
  const typeIdx = Math.floor(
    interpolate(frame, [90, 160], [0, agentMsg.length], { extrapolateRight: 'clamp' })
  );

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
            }}
          >
            {/* Memory banner */}
            <div
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(123,79,255,0.07) 0%, rgba(123,79,255,0.03) 100%)',
                borderBottom: '1px solid rgba(123,79,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
                opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(123,79,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                🧠
              </div>
              <div>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: '#7B4FFF', marginBottom: 2 }}
                >
                  Session Memory Active
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  Loaded{' '}
                  <strong style={{ color: '#111' }}>
                    <Counter value={47} frame={frame} startFrame={25} />
                  </strong>{' '}
                  memories from{' '}
                  <strong style={{ color: '#111' }}>8</strong> previous sessions on this project
                </div>
              </div>
            </div>

            {/* Main area */}
            <div
              style={{ flex: 1, overflow: 'hidden', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Memory items */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: 10,
                    opacity: interpolate(frame, [40, 52], [0, 1], { extrapolateRight: 'clamp' }),
                  }}
                >
                  What I remember about your codebase
                </div>
                {memories.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '7px 12px',
                      fontSize: 12,
                      color: '#374151',
                      fontFamily: 'SF Mono, Fira Code, monospace',
                      background: i % 2 === 0 ? 'rgba(123,79,255,0.04)' : 'transparent',
                      borderRadius: 6,
                      opacity: interpolate(
                        frame,
                        [48 + i * 7, 60 + i * 7],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                      transform: `translateX(${interpolate(
                        frame,
                        [48 + i * 7, 60 + i * 7],
                        [-16, 0],
                        { extrapolateRight: 'clamp' }
                      )}px)`,
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>

              {/* Agent response */}
              {frame >= 85 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    opacity: interpolate(frame, [85, 95], [0, 1], { extrapolateRight: 'clamp' }),
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
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(123,79,255,0.25)',
                    }}
                  >
                    🐝
                  </div>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0 16px 16px 16px',
                      padding: '12px 16px',
                      maxWidth: 560,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#7B4FFF',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      QueenBee Agent
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#374151',
                        lineHeight: 1.6,
                      }}
                    >
                      {agentMsg.slice(0, typeIdx)}
                      {typeIdx < agentMsg.length && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 2,
                            height: '1em',
                            background: '#7B4FFF',
                            marginLeft: 2,
                            verticalAlign: 'text-bottom',
                            animation: 'blink 0.8s step-end infinite',
                          }}
                        />
                      )}
                    </div>
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
