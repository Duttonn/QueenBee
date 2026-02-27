import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TextCallout: React.FC<{
  text: string;
  subtext?: string;
  position: 'top' | 'bottom';
  delay?: number;
}> = ({ text, subtext, position, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === 'top' ? 'flex-start' : 'flex-end',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - progress) * (position === 'top' ? -50 : 50)}px)`,
          opacity: progress,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <h2 style={{ color: '#fff', fontSize: 48, fontWeight: 700, margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {text}
        </h2>
        {subtext && (
          <p style={{ color: '#fbbf24', fontSize: 32, fontWeight: 500, margin: 0, opacity: 0.9 }}>
            {subtext}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
