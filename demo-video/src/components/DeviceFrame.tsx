import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface DeviceFrameProps {
  children: React.ReactNode;
  platform?: 'tiktok' | 'instagram' | 'youtube' | 'default';
}

// Safe zone margins for different platforms
const PLATFORM_SAFE_ZONES = {
  tiktok: { top: 120, bottom: 280, left: 16, right: 80 },
  instagram: { top: 80, bottom: 200, left: 24, right: 24 },
  youtube: { top: 80, bottom: 220, left: 16, right: 60 },
  default: { top: 40, bottom: 40, left: 20, right: 20 },
};

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ 
  children, 
  platform = 'default' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const safeZone = PLATFORM_SAFE_ZONES[platform];

  // Phone frame entrance animation
  const phoneEnter = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const phoneScale = 0.3 + phoneEnter * 0.7;
  const phoneOpacity = phoneEnter;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Phone Frame */}
      <div
        style={{
          width: 400,
          height: 800,
          backgroundColor: '#000',
          borderRadius: 50,
          border: '12px solid #1a1a1a',
          boxShadow: `
            0 0 0 2px #333,
            0 30px 60px rgba(0, 0, 0, 0.5),
            0 0 100px rgba(251, 191, 36, 0.1)
          `,
          transform: `scale(${phoneScale})`,
          opacity: phoneOpacity,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 150,
            height: 30,
            backgroundColor: '#1a1a1a',
            borderRadius: '0 0 20px 20px',
            zIndex: 100,
          }}
        />

        {/* Screen Content with Safe Zones */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#0f0f1a',
            paddingTop: safeZone.top,
            paddingBottom: safeZone.bottom,
            paddingLeft: safeZone.left,
            paddingRight: safeZone.right,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>

      {/* Platform UI Overlays (optional visual hints) */}
      {platform !== 'default' && (
        <div style={{ position: 'absolute', bottom: 20, left: 20, color: '#666', fontSize: 12 }}>
          Platform: {platform}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Design tokens system based on the research document
export const DESIGN_TOKENS = {
  colors: {
    primary: '#fbbf24',
    primaryDark: '#f59e0b',
    secondary: '#8b5cf6',
    success: '#22c55e',
    error: '#ef4444',
    background: '#0f0f1a',
    surface: '#1a1a2e',
    text: '#ffffff',
    textMuted: '#a1a1aa',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 48, fontWeight: 800 },
    h2: { fontSize: 32, fontWeight: 700 },
    h3: { fontSize: 24, fontWeight: 600 },
    body: { fontSize: 16, fontWeight: 400 },
    caption: { fontSize: 14, fontWeight: 400 },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};
