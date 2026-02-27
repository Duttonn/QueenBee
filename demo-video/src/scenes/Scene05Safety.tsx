import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Shield, ShieldCheck, ShieldAlert, Lock, Unlock, MessageSquare, Bell, Sliders } from 'lucide-react';

export const Scene05Safety: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases: text slides in -> reveal cards
  const textProgress = spring({ frame, fps, config: { damping: 12 } });
  const cardsProgress = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Text animation
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(textProgress, [0, 1], [-50, 0], { extrapolateRight: "clamp" });

  // Shield pulse animation
  const shieldPulse = interpolate(frame % 40, [0, 20, 40], [1, 1.05, 1], { extrapolateRight: "clamp" });

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
          color: '#22c55e',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          ✦ Safety First
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
          Agents you<br/>can <span style={{ color: '#22c55e' }}>trust.</span>
        </h2>
        
        {/* Animated Subtext */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardsProgress > 0.1 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Lock size={24} style={{ display: 'inline', marginRight: 12, color: '#ef4444', verticalAlign: 'text-bottom' }} />
            Limit what agents can do
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardsProgress > 0.3 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Bell size={24} style={{ display: 'inline', marginRight: 12, color: '#f59e0b', verticalAlign: 'text-bottom' }} />
            Approve critical actions
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: cardsProgress > 0.5 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <ShieldCheck size={24} style={{ display: 'inline', marginRight: 12, color: '#22c55e', verticalAlign: 'text-bottom' }} />
            Stay in total control
          </p>
        </div>
      </div>

      {/* Safety features - Right Side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
        {/* Command blacklist */}
        <div style={{ 
          width: 400, padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          transform: `translateX(${interpolate(cardsProgress, [0, 0.3], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" })})`,
          opacity: cardsProgress > 0.1 ? 1 : 0,
          marginRight: 80,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Lock size={28} color="#ef4444" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>Command Blacklist</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['rm -rf /', 'curl | bash', 'sudo rm', 'chmod 777'].map((cmd, i) => (
              <div key={i} style={{ 
                padding: '8px 14px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: 10,
                fontFamily: 'monospace', fontSize: 14, color: '#fca5a5', fontWeight: 500
              }}>
                {cmd}
              </div>
            ))}
          </div>
        </div>

        {/* Approval queue */}
        <div style={{ 
          width: 400, padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          transform: `translateX(${interpolate(cardsProgress, [0.15, 0.45], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" })})`,
          opacity: cardsProgress > 0.25 ? 1 : 0,
          marginRight: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Bell size={28} color="#f59e0b" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>Human Approval</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 14 }}>
            <MessageSquare size={24} color="#f59e0b" />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>Deploy to production?</div>
              <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>Pending your approval</div>
            </div>
          </div>
        </div>

        {/* Auto-recovery */}
        <div style={{ 
          width: 400, padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          transform: `translateX(${interpolate(cardsProgress, [0.3, 0.6], [400, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" })})`,
          opacity: cardsProgress > 0.4 ? 1 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <ShieldAlert size={28} color="#22c55e" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>Auto-Recovery</span>
          </div>
          <div style={{ padding: 14, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 14 }}>
            <div style={{ color: '#22c55e', fontSize: 16, fontWeight: 600 }}>✓ Agent detected loop</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>Recovered and continued safely</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
