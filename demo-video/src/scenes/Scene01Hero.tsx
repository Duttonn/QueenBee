import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Bot, Zap } from 'lucide-react';

export const Scene01Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic reveal animations like Slicer.dev template
  const titleProgress = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const subtitleProgress = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 60 } });
  const taglineProgress = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  
  // Big title letter by letter reveal
  const titleChars = ['Q', 'u', 'e', 'e', 'n', 'B', 'e', 'e'];
  const charReveal = interpolate(frame, [0, 60], [0, 1], { easing: Easing.bezier(0.4, 0, 0.2, 1) });

  // Floating animation for icon
  const floatY = interpolate(frame, [0, 60], [0, -12], { extrapolateRight: 'clamp' });
  
  // Glow pulse effect
  const glowPulse = interpolate(frame % 90, [0, 45, 90], [0.4, 0.7, 0.4], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Animated Icon with dramatic reveal */}
      <div
        style={{
          transform: `translateY(${floatY}px) scale(${0.5 + titleProgress * 0.5})`,
          opacity: titleProgress,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 30px 80px rgba(251, 191, 36, ${glowPulse})`,
          }}
        >
          <Zap size={56} fill="white" color="white" />
        </div>
      </div>

      {/* BIG MAIN TITLE - Letter by letter reveal */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {titleChars.map((char, i) => {
          const charProgress = interpolate(charReveal, [(i * 0.08), (i * 0.08) + 0.15], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <span
              key={i}
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: '#ffffff',
                display: 'inline-block',
                opacity: charProgress,
                transform: `translateY(${(1 - charProgress) * 30}px) scale(${0.8 + charProgress * 0.2})`,
                textShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
                letterSpacing: '-0.03em',
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Subtitle with highlight */}
      <p
        style={{
          fontSize: 32,
          color: '#d4d4d8',
          marginTop: 8,
          fontWeight: 500,
          opacity: subtitleProgress,
          transform: `translateY(${(1 - subtitleProgress) * 40}px)`,
          maxWidth: 700,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Your whole dev team,{' '}
        <span style={{ 
          color: '#fbbf24', 
          fontWeight: 700,
          background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          running on your machine.
        </span>
      </p>

      {/* Tagline */}
      <p
        style={{
          fontSize: 20,
          color: '#71717a',
          marginTop: 20,
          opacity: taglineProgress,
          fontWeight: 400,
        }}
      >
        The only coding platform where swarms of AI agents{' '}
        <span style={{ color: '#a78bfa', fontWeight: 600 }}>learn from every session.</span>
      </p>
    </AbsoluteFill>
  );
};
