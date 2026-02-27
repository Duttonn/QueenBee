import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { GitBranch, Layers, Shield, CheckCircle, AlertTriangle, Infinity } from 'lucide-react';

export const Scene04Feature3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases: text slides in -> reveal branches
  const textProgress = spring({ frame, fps, config: { damping: 12 } });
  const branchesProgress = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Text animation
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(textProgress, [0, 1], [-50, 0], { extrapolateRight: "clamp" });

  // Three branches sliding up with stagger
  const branch1X = interpolate(branchesProgress, [0, 0.3, 1], [400, 0, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });
  const branch2X = interpolate(branchesProgress, [0.15, 0.45, 1], [400, 0, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });
  const branch3X = interpolate(branchesProgress, [0.3, 0.6, 1], [400, 0, 0], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateRight: "clamp" });

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
          color: '#10b981',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          ✦ Git Worktrees
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
          Three features<br/>at once.
        </h2>
        
        {/* Animated Subtext */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: branchesProgress > 0.1 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Layers size={24} style={{ display: 'inline', marginRight: 12, color: '#3b82f6', verticalAlign: 'text-bottom' }} />
            Zero branch conflicts
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: branchesProgress > 0.3 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Shield size={24} style={{ display: 'inline', marginRight: 12, color: '#8b5cf6', verticalAlign: 'text-bottom' }} />
            Isolated environments
          </p>
          <p style={{ 
            fontSize: 32, 
            color: '#e4e4e7', 
            margin: 0,
            fontWeight: 500,
            opacity: branchesProgress > 0.5 ? 1 : 0.3,
            transition: 'opacity 0.5s',
          }}>
            <Infinity size={24} style={{ display: 'inline', marginRight: 12, color: '#f59e0b', verticalAlign: 'text-bottom' }} />
            True parallel workflows
          </p>
        </div>
      </div>

      {/* Git branches visualization - Right Side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
        {/* Branch 1 */}
        <div style={{ 
          transform: `translateX(${branch1X}px)`,
          width: 380, 
          padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          opacity: branchesProgress > 0.1 ? 1 : 0,
          marginRight: 80,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <GitBranch size={28} color="#3b82f6" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>feature/auth</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10b981', fontSize: 16, fontWeight: 600 }}>
            <CheckCircle size={18} /> Active
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 10 }}>
            <span style={{ fontSize: 15, color: '#60a5fa' }}>Building login API...</span>
          </div>
        </div>

        {/* Branch 2 */}
        <div style={{ 
          transform: `translateX(${branch2X}px)`,
          width: 380, 
          padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          opacity: branchesProgress > 0.25 ? 1 : 0,
          marginRight: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <GitBranch size={28} color="#8b5cf6" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>feature/payments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10b981', fontSize: 16, fontWeight: 600 }}>
            <CheckCircle size={18} /> Active
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: 10 }}>
            <span style={{ fontSize: 15, color: '#a78bfa' }}>Designing checkout UI...</span>
          </div>
        </div>

        {/* Branch 3 */}
        <div style={{ 
          transform: `translateX(${branch3X}px)`,
          width: 380, 
          padding: 24, 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          borderRadius: 24, 
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          opacity: branchesProgress > 0.4 ? 1 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <GitBranch size={28} color="#f59e0b" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>fix/login-bug</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10b981', fontSize: 16, fontWeight: 600 }}>
            <CheckCircle size={18} /> Active
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 10 }}>
            <span style={{ fontSize: 15, color: '#fbbf24' }}>Debugging session...</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
