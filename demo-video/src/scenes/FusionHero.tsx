import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

// Opening hero — dark macOS gradient bg, bee pulses in, title springs up, tagline fades.
// Designed to flow straight into the first FusionKeyword (light bg flash transitions out).

export const FusionHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowProg  = spring({ frame,        fps, config: { damping: 10, stiffness: 60 } });
  const logoProg  = spring({ frame,        fps, config: { damping: 13, stiffness: 90 } });
  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 85 } });
  const tagProg   = spring({ frame: frame - 26, fps, config: { damping: 16, stiffness: 80 } });
  const divProg   = interpolate(frame, [34, 50], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #5b21b6 0%, #2d1b69 35%, #1a0f3d 65%, #05030c 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Dot grid */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Radial purple glow */}
      <div
        style={{
          position: 'absolute',
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,79,255,0.28) 0%, transparent 70%)',
          opacity: glowProg,
          transform: `scale(${interpolate(glowProg, [0, 1], [0.5, 1])})`,
        }}
      />

      {/* Bee icon */}
      <div
        style={{
          fontSize: 80,
          lineHeight: 1,
          opacity: logoProg,
          transform: `scale(${interpolate(logoProg, [0, 1], [0.5, 1])})`,
          filter: `drop-shadow(0 0 40px rgba(123,79,255,${logoProg * 0.7}))`,
          marginBottom: 20,
          position: 'relative',
          zIndex: 1,
        }}
      >
        🐝
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          opacity: titleProg,
          transform: `translateY(${interpolate(titleProg, [0, 1], [28, 0])}px)`,
          position: 'relative',
          zIndex: 1,
          marginBottom: 16,
        }}
      >
        QueenBee
      </div>

      {/* Thin divider line */}
      <div
        style={{
          width: interpolate(divProg, [0, 1], [0, 240]),
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(123,79,255,0.7), transparent)',
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.52)',
          letterSpacing: '-0.01em',
          opacity: tagProg,
          transform: `translateY(${interpolate(tagProg, [0, 1], [14, 0])}px)`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Your AI dev team.{' '}
        <span style={{ color: 'rgba(167,139,250,0.75)' }}>In your terminal.</span>
      </div>
    </AbsoluteFill>
  );
};
