import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Brain, Clock, RefreshCw, Calendar, Sparkles } from 'lucide-react';

export const Scene03Feature2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases: text slides in -> reveal bars
  const textProgress = spring({ frame, fps, config: { damping: 12 } });
  const barsProgress = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Text animation
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(textProgress, [0, 1], [-50, 0], { extrapolateRight: "clamp" });

  // Bars showing growth with animation
  const bar1Height = interpolate(barsProgress, [0, 0.4, 1], [0, 80, 200], { extrapolateRight: "clamp" });
  const bar2Height = interpolate(barsProgress, [0.15, 0.55, 1], [0, 110, 280], { extrapolateRight: "clamp" });
  const bar3Height = interpolate(barsProgress, [0.3, 0.7, 1], [0, 140, 380], { extrapolateRight: "clamp" });

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
          color: '#8b5cf6',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          ✦ Cross-Session Memory
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
          Your agent<br/>remembers <span style={{ color: '#8b5cf6' }}>everything.</span>
        </h2>
        
        {/* Animated Subtext */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: barsProgress > 0.1 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Calendar size={24} style={{ display: 'inline', marginRight: 12, color: '#6366f1', verticalAlign: 'text-bottom' }} />
            Context builds over time
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: barsProgress > 0.3 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Brain size={24} style={{ display: 'inline', marginRight: 12, color: '#8b5cf6', verticalAlign: 'text-bottom' }} />
            Learns your codebase rules
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: barsProgress > 0.5 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Sparkles size={24} style={{ display: 'inline', marginRight: 12, color: '#c084fc', verticalAlign: 'text-bottom' }} />
            Gets smarter every session
          </p>
        </div>
      </div>

      {/* Memory visualization - Right Side */}
      <div style={{ flex: 1, display: 'flex', gap: 40, alignItems: 'flex-end', justifyContent: 'center', height: 440 }}>
        {/* Session 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 120, 
            height: bar1Height, 
            background: 'linear-gradient(180deg, #8b5cf6, #6366f1)', 
            borderRadius: 16, 
            opacity: barsProgress > 0.2 ? 1 : 0,
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: barsProgress > 0.2 ? 1 : 0 }}>
            <Clock size={24} color="#71717a" />
            <span style={{ fontSize: 20, color: '#71717a', fontWeight: 600 }}>Last Week</span>
          </div>
        </div>

        {/* Session 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 120, 
            height: bar2Height, 
            background: 'linear-gradient(180deg, #a855f7, #8b5cf6)', 
            borderRadius: 16, 
            opacity: barsProgress > 0.4 ? 1 : 0,
            boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: barsProgress > 0.4 ? 1 : 0 }}>
            <Clock size={24} color="#71717a" />
            <span style={{ fontSize: 20, color: '#71717a', fontWeight: 600 }}>Yesterday</span>
          </div>
        </div>

        {/* Session 3 - Today */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 120, 
            height: bar3Height, 
            background: 'linear-gradient(180deg, #c084fc, #a855f7)', 
            borderRadius: 16, 
            opacity: barsProgress > 0.6 ? 1 : 0,
            boxShadow: '0 0 50px rgba(192, 132, 252, 0.6)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: barsProgress > 0.6 ? 1 : 0 }}>
            <Clock size={24} color="#c084fc" />
            <span style={{ fontSize: 20, color: '#c084fc', fontWeight: 800 }}>Today</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
