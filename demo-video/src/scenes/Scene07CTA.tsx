import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Zap, ArrowRight } from 'lucide-react';

export const Scene07CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic reveal animations like templates
  const titleProgress = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const priceProgress = spring({ frame: frame - 15, fps, config: { damping: 12 } });
  const featuresProgress = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const buttonProgress = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  // Glow animation
  const glow = interpolate(frame % 60, [0, 30, 60], [0.4, 0.7, 0.4], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Logo with dramatic entrance */}
      <div
        style={{
          transform: `scale(${0.5 + titleProgress * 0.5})`,
          opacity: titleProgress,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 30px 80px rgba(251, 191, 36, ${glow})`,
          }}
        >
          <Zap size={52} fill="white" color="white" />
        </div>
      </div>

      {/* BIG TITLE */}
      <h1
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#ffffff',
          margin: 0,
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 40}px)`,
          textShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
          letterSpacing: '-0.02em',
        }}
      >
        QueenBee Pro
      </h1>

      {/* Price with gradient */}
      <p
        style={{
          fontSize: 42,
          color: '#fbbf24',
          marginTop: 20,
          fontWeight: 700,
          opacity: priceProgress,
          background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        $49 / month
      </p>

      {/* Features list */}
      <ul
        style={{
          fontSize: 20,
          color: '#a1a1aa',
          marginTop: 32,
          opacity: featuresProgress,
          textAlign: 'center',
          lineHeight: 2.2,
          listStyle: 'none',
          padding: 0,
        }}
      >
        <li>✦ Unlimited sessions</li>
        <li>✦ Up to 3 parallel agents</li>
        <li>✦ Cross-session memory</li>
        <li>✦ Flat billing — no surprises</li>
      </ul>

      {/* CTA Button with dramatic entrance */}
      <div
        style={{
          marginTop: 48,
          opacity: buttonProgress,
          transform: `translateY(${(1 - buttonProgress) * 30}px) scale(${0.9 + buttonProgress * 0.1})`,
        }}
      >
        <div
          style={{
            padding: '24px 56px',
            backgroundColor: '#ffffff',
            color: '#111827',
            borderRadius: 999,
            fontSize: 28,
            fontWeight: 800,
            boxShadow: `0 20px 48px rgba(251, 191, 36, ${0.4 + glow * 0.2})`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>getqueenbee.app</span>
          <ArrowRight size={28} />
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          fontSize: 16,
          color: '#52525b',
          marginTop: 40,
          opacity: buttonProgress,
          fontWeight: 500,
        }}
      >
        Free trial available. No credit card required.
      </p>
    </AbsoluteFill>
  );
};
