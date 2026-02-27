import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

// Final CTA scene.
// Dark purple gradient bg (matches macOS desktop scenes), 🐝 logo springs in,
// URL and CTA button fade up, subtle particle grid in background.

export const FusionCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProg = spring({ frame, fps, config: { damping: 12, stiffness: 90 } });
  const titleProg = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 85 } });
  const tagProg = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 80 } });
  const btnProg = spring({ frame: frame - 44, fps, config: { damping: 14, stiffness: 80 } });
  const urlProg = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #5b21b6 0%, #2d1b69 35%, #1a0f3d 65%, #05030c 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 0,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Dot grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Radial glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,79,255,0.25) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${interpolate(logoProg, [0, 1], [0.4, 1])})`,
          opacity: logoProg,
        }}
      />

      {/* Logo icon */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #7B4FFF 0%, #a78bfa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          boxShadow: '0 16px 60px rgba(123,79,255,0.5)',
          opacity: logoProg,
          transform: `scale(${interpolate(logoProg, [0, 1], [0.6, 1])}) translateY(${interpolate(
            logoProg,
            [0, 1],
            [32, 0]
          )}px)`,
          marginBottom: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        🐝
      </div>

      {/* Product name */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          opacity: titleProg,
          transform: `translateY(${interpolate(titleProg, [0, 1], [24, 0])}px)`,
          position: 'relative',
          zIndex: 1,
          marginBottom: 12,
        }}
      >
        QueenBee
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 22,
          color: 'rgba(255,255,255,0.55)',
          fontWeight: 400,
          letterSpacing: '-0.01em',
          opacity: tagProg,
          transform: `translateY(${interpolate(tagProg, [0, 1], [16, 0])}px)`,
          position: 'relative',
          zIndex: 1,
          marginBottom: 40,
        }}
      >
        The autonomous multi-agent IDE
      </div>

      {/* CTA button */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          opacity: btnProg,
          transform: `translateY(${interpolate(btnProg, [0, 1], [16, 0])}px)`,
          position: 'relative',
          zIndex: 1,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #7B4FFF 0%, #a78bfa 100%)',
            borderRadius: 14,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(123,79,255,0.5)',
          }}
        >
          Try free →
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 14,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          Star on GitHub ★
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.04em',
          opacity: urlProg,
          position: 'relative',
          zIndex: 1,
        }}
      >
        queenbee.dev
      </div>
    </AbsoluteFill>
  );
};
