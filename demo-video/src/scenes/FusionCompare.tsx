import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

// Slicer-style product card comparison scene.
// Light #E8EDF2 background, white card slides up, comparison table inside.

const rows = [
  { label: 'Parallel agents',   qb: true,  codex: false, cursor: false, devin: true  },
  { label: 'Shared memory',     qb: true,  codex: false, cursor: false, devin: false },
  { label: 'Policy safety',     qb: true,  codex: true,  cursor: false, devin: false },
  { label: 'Local + cloud',     qb: true,  codex: false, cursor: true,  devin: false },
  { label: 'Open source',       qb: true,  codex: false, cursor: false, devin: false },
];

const Check: React.FC<{ yes: boolean }> = ({ yes }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: yes ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.12)',
      fontSize: 12,
      color: yes ? '#16a34a' : '#d1d5db',
      fontWeight: 700,
    }}
  >
    {yes ? '✓' : '✕'}
  </span>
);

const ColHeader: React.FC<{ label: string; accent?: string; frame: number; delay: number }> = ({
  label,
  accent,
  frame,
  delay,
}) => {
  const prog = interpolate(frame, [delay, delay + 16], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: accent ?? '#9ca3af',
        opacity: prog,
        transform: `translateY(${interpolate(prog, [0, 1], [8, 0])}px)`,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {label}
    </div>
  );
};

export const FusionCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card springs up from below
  const cardProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });

  // Tag pill springs in slightly delayed
  const tagProg = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 90 } });

  // Subtitle fades in at frame 30
  const subtitleProg = interpolate(frame, [30, 46], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#E8EDF2',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Floating product card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)',
          padding: '32px 36px',
          width: 680,
          opacity: cardProg,
          transform: `translateY(${interpolate(cardProg, [0, 1], [60, 0])}px) scale(${interpolate(
            cardProg,
            [0, 1],
            [0.95, 1]
          )})`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7B4FFF 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(123,79,255,0.30)',
            }}
          >
            🐝
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
              QueenBee
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              The autonomous multi-agent IDE
            </div>
          </div>
          {/* Tag pill */}
          <div
            style={{
              marginLeft: 'auto',
              background: 'rgba(123,79,255,0.08)',
              border: '1px solid rgba(123,79,255,0.18)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#7B4FFF',
              letterSpacing: '0.04em',
              opacity: tagProg,
              transform: `scale(${interpolate(tagProg, [0, 1], [0.85, 1])})`,
            }}
          >
            OPEN SOURCE
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: '#f3f4f6',
            marginBottom: 20,
            opacity: interpolate(frame, [18, 30], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        />

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 90px 90px 90px',
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          <div />
          <ColHeader label="QueenBee" accent="#7B4FFF" frame={frame} delay={22} />
          <ColHeader label="Codex" frame={frame} delay={28} />
          <ColHeader label="Cursor" frame={frame} delay={34} />
          <ColHeader label="Devin" frame={frame} delay={40} />
        </div>

        {/* Comparison rows */}
        {rows.map((row, i) => {
          const rowProg = interpolate(
            frame,
            [46 + i * 8, 58 + i * 8],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          return (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 90px 90px 90px',
                alignItems: 'center',
                padding: '9px 4px',
                borderRadius: 8,
                background: i % 2 === 0 ? 'rgba(123,79,255,0.03)' : 'transparent',
                opacity: rowProg,
                transform: `translateX(${interpolate(rowProg, [0, 1], [-12, 0])}px)`,
              }}
            >
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                {row.label}
              </span>
              {[row.qb, row.codex, row.cursor, row.devin].map((val, j) => (
                <div
                  key={j}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Check yes={val} />
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer subtitle */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #f3f4f6',
            fontSize: 12,
            color: '#9ca3af',
            textAlign: 'center',
            opacity: subtitleProg,
          }}
        >
          queenbee.dev · Free & open source · Runs locally or in the cloud
        </div>
      </div>
    </AbsoluteFill>
  );
};
