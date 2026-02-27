import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Users, Zap, Coffee, ArrowRight } from 'lucide-react';

export const Scene02Feature1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases: text slides in -> reveal cards
  const textProgress = spring({ frame, fps, config: { damping: 12 } });
  const cardProgress = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Text animation
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(textProgress, [0, 1], [-50, 0], { extrapolateRight: "clamp" });

  // Feature cards slide in from right with stagger
  const card1X = interpolate(cardProgress, [0, 1], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });
  const card2X = interpolate(cardProgress, [0.15, 1], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });
  const card3X = interpolate(cardProgress, [0.3, 1], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });

  const cardsOpacity = interpolate(cardProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Pulse effect on working indicators
  const pulse1 = interpolate(frame % 40, [0, 20, 40], [1, 1.2, 1], { extrapolateRight: "clamp" });
  const pulse2 = interpolate((frame + 10) % 40, [0, 20, 40], [1, 1.2, 1], { extrapolateRight: "clamp" });
  const pulse3 = interpolate((frame + 20) % 40, [0, 20, 40], [1, 1.2, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 80px' }}>
      {/* BIG TEXT - Left Side */}
      <div style={{ 
        flex: 1,
        opacity: textOpacity,
        transform: `translateX(${textX}px)`,
        paddingRight: 60,
      }}>
        {/* Feature Label */}
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#3b82f6',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          ✦ Parallel Agents
        </div>
        
        {/* HUGE TITLE */}
        <h2 style={{ 
          fontSize: 84, 
          fontWeight: 900, 
          color: 'white', 
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          textShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
        }}>
          Kick off a<br/>whole feature
        </h2>
        
        {/* Animated Subtext */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardProgress > 0.05 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Zap size={24} style={{ display: 'inline', marginRight: 12, color: '#3b82f6', verticalAlign: 'text-bottom' }} />
            API Agent builds endpoints
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardProgress > 0.2 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Users size={24} style={{ display: 'inline', marginRight: 12, color: '#8b5cf6', verticalAlign: 'text-bottom' }} />
            UI Agent creates components
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardProgress > 0.35 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Coffee size={24} style={{ display: 'inline', marginRight: 12, color: '#10b981', verticalAlign: 'text-bottom' }} />
            Test Agent verifies everything
          </p>
        </div>
      </div>

      {/* Three agent cards - Right Side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-end', opacity: cardsOpacity }}>
        {/* Agent 1 */}
        <div
          style={{
            transform: `translateX(${card1X}px)`,
            opacity: cardProgress > 0.05 ? 1 : 0,
            width: 320,
            padding: 24,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div style={{ 
            width: 56, height: 56, borderRadius: 16, 
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          }}>
            <Zap size={28} fill="white" color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '0 0 4px 0' }}>API Agent</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                flex: 1, height: 6, background: 'rgba(59, 130, 246, 0.3)', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{ 
                  width: '65%', height: '100%', background: '#3b82f6', borderRadius: 3,
                  transform: `scaleX(${pulse1})`, transformOrigin: 'left',
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>Working...</span>
            </div>
          </div>
        </div>

        {/* Agent 2 */}
        <div
          style={{
            transform: `translateX(${card2X}px)`,
            opacity: cardProgress > 0.2 ? 1 : 0,
            width: 320,
            padding: 24,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginRight: 40, // Staggered layout
          }}
        >
          <div style={{ 
            width: 56, height: 56, borderRadius: 16, 
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
          }}>
            <Users size={28} fill="white" color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '0 0 4px 0' }}>UI Agent</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                flex: 1, height: 6, background: 'rgba(139, 92, 246, 0.3)', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{ 
                  width: '45%', height: '100%', background: '#8b5cf6', borderRadius: 3,
                  transform: `scaleX(${pulse2})`, transformOrigin: 'left',
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 600 }}>Working...</span>
            </div>
          </div>
        </div>

        {/* Agent 3 */}
        <div
          style={{
            transform: `translateX(${card3X}px)`,
            opacity: cardProgress > 0.35 ? 1 : 0,
            width: 320,
            padding: 24,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginRight: 80, // Staggered layout
          }}
        >
          <div style={{ 
            width: 56, height: 56, borderRadius: 16, 
            background: 'linear-gradient(135deg, #10b981, #047857)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          }}>
            <Coffee size={28} fill="white" color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '0 0 4px 0' }}>Test Agent</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                flex: 1, height: 6, background: 'rgba(16, 185, 129, 0.3)', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{ 
                  width: '80%', height: '100%', background: '#10b981', borderRadius: 3,
                  transform: `scaleX(${pulse3})`, transformOrigin: 'left',
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Working...</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
