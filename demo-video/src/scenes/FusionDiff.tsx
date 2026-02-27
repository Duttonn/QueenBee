import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';

const MacOSDesktop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(ellipse at 35% 25%, #5b21b6 0%, #2d1b69 30%, #1a0f3d 60%, #05030c 100%)',
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  </AbsoluteFill>
);

// Changed files list
const changedFiles = [
  { name: 'src/auth/service.ts',    adds: 48, dels: 6,  active: true  },
  { name: 'src/auth/middleware.ts', adds: 17, dels: 3,  active: false },
  { name: 'src/auth/types.ts',      adds: 12, dels: 0,  active: false },
  { name: 'src/auth/index.ts',      adds: 4,  dels: 1,  active: false },
];

type DiffLine =
  | { type: 'add';    num: number; content: string }
  | { type: 'del';    num: number; content: string }
  | { type: 'ctx';    num: number; content: string };

const diffLines: DiffLine[] = [
  { type: 'ctx', num: 1,  content: "import { createClient } from '@supabase/supabase-js';" },
  { type: 'add', num: 2,  content: "import { JWTService } from './jwt';" },
  { type: 'add', num: 3,  content: "import { UserRepository } from '../db/users';" },
  { type: 'add', num: 4,  content: "import type { AuthResult } from './types';" },
  { type: 'ctx', num: 5,  content: '' },
  { type: 'del', num: 6,  content: "const authenticate = async (token: string) => {" },
  { type: 'add', num: 6,  content: "export const authenticate = async (token: string): Promise<AuthResult> => {" },
  { type: 'add', num: 7,  content: "  const payload = await JWTService.verify(token);" },
  { type: 'add', num: 8,  content: "  const user = await UserRepository.findById(payload.userId);" },
  { type: 'ctx', num: 9,  content: "  if (!user) throw new UnauthorizedError();" },
  { type: 'add', num: 10, content: "  return { user, token, expiresAt: payload.exp };" },
  { type: 'del', num: 10, content: "  return user;" },
  { type: 'ctx', num: 11, content: "};" },
];

// Map each line to a reveal frame — adds first, then dels
const ADD_START = 45;
const ADD_STEP  = 5;
const DEL_START = 90;
const DEL_STEP  = 6;

let addIdx = 0;
let delIdx = 0;
const lineFrames = diffLines.map((l) => {
  if (l.type === 'add') return ADD_START + (addIdx++) * ADD_STEP;
  if (l.type === 'del') return DEL_START + (delIdx++) * DEL_STEP;
  return 20; // context lines appear with the header
});

export const FusionDiff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winProg = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const headerProg = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' });
  const filesProg  = interpolate(frame, [22, 38], [0, 1], { extrapolateRight: 'clamp' });

  // "Approve & merge" button springs in at frame 120
  const approveProg = spring({
    frame: frame - 120,
    fps,
    config: { stiffness: 120, damping: 12 },
  });
  const showApprove = frame >= 120;

  return (
    <AbsoluteFill>
      <MacOSDesktop />
      <MacWindow
        scale={interpolate(winProg, [0, 1], [0.92, 1])}
        yOffset={interpolate(winProg, [0, 1], [40, 0])}
        opacity={winProg}
      >
        <AppUI activeProjectName="e-commerce">
          {/* Two-panel diff layout */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, sans-serif',
              position: 'relative',
            }}
          >
            {/* ── Left: Changed files ────────────────────────────────────── */}
            <div
              style={{
                width: 220,
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                background: '#fafafa',
                flexShrink: 0,
                opacity: filesProg,
              }}
            >
              <div
                style={{
                  padding: '12px 14px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Changed files
              </div>
              {changedFiles.map((f, i) => {
                const fp = interpolate(frame, [24 + i * 5, 36 + i * 5], [0, 1], {
                  extrapolateRight: 'clamp',
                });
                return (
                  <div
                    key={i}
                    style={{
                      padding: '7px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: f.active ? 'rgba(123,79,255,0.06)' : 'transparent',
                      borderLeft: f.active ? '2px solid #7B4FFF' : '2px solid transparent',
                      opacity: fp,
                      transform: `translateX(${interpolate(fp, [0, 1], [-8, 0])}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'SF Mono, Fira Code, monospace',
                        fontSize: 11,
                        color: f.active ? '#374151' : '#6b7280',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.name.replace('src/auth/', '')}
                    </span>
                    <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>
                      +{f.adds}
                    </span>
                    {f.dels > 0 && (
                      <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                        -{f.dels}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Diff summary chips */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '12px 14px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  opacity: interpolate(frame, [36, 50], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.18)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#16a34a',
                  }}
                >
                  +81 additions
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#dc2626',
                  }}
                >
                  −10 deletions
                </div>
              </div>
            </div>

            {/* ── Right: Diff content ────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* File header */}
              <div
                style={{
                  padding: '10px 18px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexShrink: 0,
                  opacity: headerProg,
                }}
              >
                <span
                  style={{
                    fontFamily: 'SF Mono, Fira Code, monospace',
                    fontSize: 12,
                    color: '#374151',
                    fontWeight: 600,
                  }}
                >
                  src/auth/service.ts
                </span>
                <span
                  style={{
                    fontSize: 10,
                    background: 'rgba(123,79,255,0.08)',
                    color: '#7B4FFF',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  Agent α
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
                  8 hunks · 91 lines
                </span>
              </div>

              {/* Diff lines */}
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  padding: '8px 0',
                  fontFamily: 'SF Mono, Fira Code, monospace',
                  fontSize: 11.5,
                  lineHeight: 1.7,
                }}
              >
                {diffLines.map((line, i) => {
                  const revealF = lineFrames[i];
                  const lp = interpolate(frame, [revealF, revealF + 10], [0, 1], {
                    extrapolateRight: 'clamp',
                  });
                  if (frame < revealF) return null;

                  const bg =
                    line.type === 'add'
                      ? 'rgba(34,197,94,0.07)'
                      : line.type === 'del'
                      ? 'rgba(239,68,68,0.07)'
                      : 'transparent';
                  const prefix =
                    line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
                  const prefixColor =
                    line.type === 'add' ? '#16a34a' : line.type === 'del' ? '#dc2626' : '#d1d5db';
                  const textColor =
                    line.type === 'add'
                      ? '#166534'
                      : line.type === 'del'
                      ? '#991b1b'
                      : '#374151';

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: bg,
                        paddingLeft: 0,
                        opacity: lp,
                        transform: `translateX(${interpolate(lp, [0, 1], [-6, 0])}px)`,
                        borderLeft:
                          line.type === 'add'
                            ? '3px solid rgba(34,197,94,0.5)'
                            : line.type === 'del'
                            ? '3px solid rgba(239,68,68,0.4)'
                            : '3px solid transparent',
                      }}
                    >
                      {/* Line number */}
                      <span
                        style={{
                          width: 40,
                          textAlign: 'right',
                          paddingRight: 12,
                          color: '#d1d5db',
                          fontSize: 10,
                          userSelect: 'none',
                          flexShrink: 0,
                        }}
                      >
                        {line.num}
                      </span>
                      {/* Prefix */}
                      <span
                        style={{
                          width: 16,
                          flexShrink: 0,
                          color: prefixColor,
                          fontWeight: 700,
                        }}
                      >
                        {prefix}
                      </span>
                      {/* Code */}
                      <span style={{ color: textColor }}>{line.content}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Approve floating card (springs in at f=120) ─────────────── */}
            {showApprove && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.11)',
                  padding: '14px 18px',
                  width: 300,
                  opacity: approveProg,
                  transform: `translateY(${interpolate(approveProg, [0, 1], [20, 0])}px)`,
                  zIndex: 50,
                }}
              >
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 4 }}
                >
                  Review complete ✓
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
                  Agent α wrote <strong style={{ color: '#111' }}>8 files</strong> for{' '}
                  <code
                    style={{
                      background: '#f3f4f6',
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    feature/auth-service
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      background: '#111',
                      color: '#fff',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    Approve & merge
                  </div>
                  <div
                    style={{
                      padding: '8px 14px',
                      background: '#f3f4f6',
                      color: '#374151',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    Request changes
                  </div>
                </div>
              </div>
            )}
          </div>
        </AppUI>
      </MacWindow>
    </AbsoluteFill>
  );
};
