import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TextCallout } from '../components/TextCallout';

export const Scene10CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  const buttonProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <h1
        style={{
          fontSize: 80,
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          opacity: titleProgress,
          transform: `scale(${titleProgress}) translateY(${(1 - titleProgress) * 40}px)`,
          textShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #ea580c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        QueenBee Pro
      </h1>
      <p
        style={{
          fontSize: 40,
          color: '#f3f4f6',
          marginTop: 24,
          fontWeight: 500,
          opacity: titleProgress,
        }}
      >
        $49 / month
      </p>
      <div
        style={{
          marginTop: 48,
          padding: '20px 48px',
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: 999,
          fontSize: 32,
          fontWeight: 800,
          opacity: buttonProgress,
          transform: `scale(${buttonProgress})`,
          boxShadow: '0 16px 32px rgba(251, 191, 36, 0.3)',
          cursor: 'pointer',
        }}
      >
        getqueenbee.app
      </div>
    </AbsoluteFill>
  );
};
