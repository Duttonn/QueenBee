import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Check, X, Zap, Trophy, ShieldCheck, Crown } from 'lucide-react';

export const Scene06Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases: text slides in -> reveal table
  const textProgress = spring({ frame, fps, config: { damping: 12 } });
  const tableProgress = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Text animation
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(textProgress, [0, 1], [-50, 0], { extrapolateRight: "clamp" });

  const features = [
    { name: 'Runs on your machine', qb: true, codex: false, cursor: false, devin: false },
    { name: 'Session memory', qb: true, codex: false, cursor: false, devin: false },
    { name: 'Parallel agents', qb: true, codex: false, cursor: false, devin: false },
    { name: 'Flat billing', qb: true, codex: true, cursor: false, devin: false },
    { name: 'Auto-recovery', qb: true, codex: false, cursor: false, devin: false },
  ];

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
          color: '#fbbf24',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          ✦ Compare
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
          The comparison<br/>is <span style={{ color: '#fbbf24' }}>clear.</span>
        </h2>
        
        {/* Animated Subtext */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: tableProgress > 0.1 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Crown size={24} style={{ display: 'inline', marginRight: 12, color: '#fbbf24', verticalAlign: 'text-bottom' }} />
            The ultimate IDE standard
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: tableProgress > 0.4 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <ShieldCheck size={24} style={{ display: 'inline', marginRight: 12, color: '#22c55e', verticalAlign: 'text-bottom' }} />
            Locally hosted, totally safe
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: tableProgress > 0.7 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Trophy size={24} style={{ display: 'inline', marginRight: 12, color: '#60a5fa', verticalAlign: 'text-bottom' }} />
            Unmatched memory & speed
          </p>
        </div>
      </div>

      {/* Comparison table - Right Side */}
      <div style={{ 
        flex: 1.2,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
        borderRadius: 28, 
        border: '1px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)',
        transform: `translateX(${interpolate(tableProgress, [0, 0.5], [200, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" })})`,
        opacity: tableProgress
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <th style={{ padding: '24px 28px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 16 }}>Feature</th>
              <th style={{ padding: '24px 28px', textAlign: 'center', color: '#fbbf24', fontWeight: 800, fontSize: 22 }}>QueenBee</th>
              <th style={{ padding: '24px 28px', textAlign: 'center', color: '#a1a1aa', fontWeight: 600, fontSize: 16 }}>Codex</th>
              <th style={{ padding: '24px 28px', textAlign: 'center', color: '#a1a1aa', fontWeight: 600, fontSize: 16 }}>Cursor</th>
              <th style={{ padding: '24px 28px', textAlign: 'center', color: '#a1a1aa', fontWeight: 600, fontSize: 16 }}>Devin</th>
            </tr>
          </thead>
          <tbody>
            {features.map((row, i) => {
              const rowY = interpolate(tableProgress, [(i * 0.08), (i * 0.08) + 0.4], [50, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });
              return (
                <tr key={i} style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transform: `translateY(${rowY}px)`,
                  opacity: tableProgress > i * 0.08 ? 1 : 0
                }}>
                  <td style={{ padding: '20px 28px', color: '#e4e4e7', fontWeight: 600, fontSize: 18 }}>{row.name}</td>
                  <td style={{ padding: '20px 28px', textAlign: 'center' }}>
                    {row.qb ? <Check size={28} color="#22c55e" /> : <X size={28} color="#3f3f46" />}
                  </td>
                  <td style={{ padding: '20px 28px', textAlign: 'center' }}>
                    {row.codex ? <Check size={28} color="#22c55e" /> : <X size={28} color="#3f3f46" />}
                  </td>
                  <td style={{ padding: '20px 28px', textAlign: 'center' }}>
                    {row.cursor ? <Check size={28} color="#22c55e" /> : <X size={28} color="#3f3f46" />}
                  </td>
                  <td style={{ padding: '20px 28px', textAlign: 'center' }}>
                    {row.devin ? <Check size={28} color="#22c55e" /> : <X size={28} color="#3f3f46" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AbsoluteFill>
  );
};

