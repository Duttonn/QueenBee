import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing, Sequence } from 'remotion';
import { DeviceFrame, DESIGN_TOKENS } from '../components/DeviceFrame';
import { useTextReveal, useProgressAnimation, TypewriterText } from '../services/dataHydration';
import { Zap, Users, Coffee, Brain, Layers, CheckCircle } from 'lucide-react';

// Advanced spring physics configuration per research document
const SPRING_CONFIGS = {
  quick: { damping: 8, stiffness: 200, mass: 0.5 },
  bouncy: { damping: 10, stiffness: 100, mass: 1 },
  smooth: { damping: 15, stiffness: 80, mass: 1.5 },
};

export const Scene08DeviceDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases using advanced spring physics
  const phoneEnter = spring({ frame, fps, config: SPRING_CONFIGS.bouncy });
  const contentFade = spring({ frame: frame - 20, fps, config: SPRING_CONFIGS.smooth });
  
  // Header animation with spring
  const headerSlide = spring({ frame: frame - 30, fps, config: SPRING_CONFIGS.quick });

  // Scale the phone for 1920x1080 composition
  const phoneScale = 0.5 + phoneEnter * 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: DESIGN_TOKENS.colors.background }}>
      {/* Big text before phone appears */}
      <div style={{ 
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        opacity: 1 - phoneEnter,
        zIndex: 10,
      }}>
        <h1 style={{
          ...DESIGN_TOKENS.typography.h1,
          color: DESIGN_TOKENS.colors.text,
          textShadow: '0 8px 40px rgba(0,0,0,0.5)',
          fontSize: 64,
        }}>
          See QueenBee in Action
        </h1>
        <p style={{
          ...DESIGN_TOKENS.typography.body,
          color: DESIGN_TOKENS.colors.textMuted,
          marginTop: 16,
          fontSize: 24,
        }}>
          Tap, swipe, and interact
        </p>
      </div>

      {/* Phone with device frame - scaled for desktop */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${phoneScale})`,
        opacity: phoneEnter,
      }}>
        <DeviceFrame platform="tiktok">
          <Sequence from={30}>
            {/* App Header */}
            <div style={{
              padding: DESIGN_TOKENS.spacing.md,
              transform: `translateY(${(1 - headerSlide) * -50}px)`,
              opacity: headerSlide,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Zap size={20} fill="white" color="white" />
                </div>
                <span style={{
                  ...DESIGN_TOKENS.typography.h3,
                  color: DESIGN_TOKENS.colors.text,
                }}>
                  QueenBee
                </span>
                <div style={{ width: 40 }} />
              </div>
            </div>

            {/* AI Chat Interface */}
            <div style={{
              padding: DESIGN_TOKENS.spacing.md,
              opacity: contentFade,
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                padding: DESIGN_TOKENS.spacing.md,
                marginBottom: DESIGN_TOKENS.spacing.md,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing.sm,
                  marginBottom: DESIGN_TOKENS.spacing.sm,
                }}>
                  <Brain size={16} color="#8b5cf6" />
                  <span style={{
                    ...DESIGN_TOKENS.typography.caption,
                    color: DESIGN_TOKENS.colors.secondary,
                    fontWeight: 600,
                  }}>
                    AI Assistant
                  </span>
                </div>
                <TypewriterText 
                  text="I've analyzed your cooking patterns. Here's a personalized meal plan for this week!"
                  startFrame={60}
                  speed={3}
                  style={{
                    ...DESIGN_TOKENS.typography.body,
                    color: DESIGN_TOKENS.colors.text,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Task Cards */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: DESIGN_TOKENS.spacing.sm,
              }}>
                {[
                  { icon: Zap, color: '#3b82f6', task: 'API Agent', msg: 'Building endpoints...' },
                  { icon: Users, color: '#8b5cf6', task: 'UI Agent', msg: 'Designing components...' },
                  { icon: Coffee, color: '#10b981', task: 'Test Agent', msg: 'Running tests...' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    padding: DESIGN_TOKENS.spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing.md,
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: DESIGN_TOKENS.borderRadius.sm,
                      background: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <item.icon size={18} fill="white" color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        ...DESIGN_TOKENS.typography.caption,
                        color: DESIGN_TOKENS.colors.text,
                        fontWeight: 600,
                      }}>
                        {item.task}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: DESIGN_TOKENS.colors.textMuted,
                      }}>
                        {item.msg}
                      </div>
                      {/* Progress bar */}
                      <div style={{
                        marginTop: 8,
                        height: 4,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${40 + i * 20}%`,
                          height: '100%',
                          background: item.color,
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>
                    <CheckCircle size={18} color="#22c55e" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom action button */}
            <div style={{
              position: 'absolute',
              bottom: 40,
              left: 20,
              right: 20,
              padding: DESIGN_TOKENS.spacing.md,
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              textAlign: 'center',
            }}>
              <span style={{
                ...DESIGN_TOKENS.typography.body,
                color: 'white',
                fontWeight: 700,
              }}>
                Start Your AI Chef Journey →
              </span>
            </div>
          </Sequence>
        </DeviceFrame>
      </div>

      {/* Platform indicator */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        fontSize: 12,
        color: '#888',
      }}>
        📱 TikTok Safe Zone
      </div>
    </AbsoluteFill>
  );
};
