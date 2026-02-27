import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

interface FusionKeywordProps {
  word: string;
  subtitle: string;
  accentColor?: string;
}

/**
 * Slicer × Codex keyword beat.
 *
 * Animation layers:
 *  1. Whole-scene slow zoom-out (1.05 → 1.0) — Codex camera-pull feel
 *  2. Each character types in one at a time at ~12 chars/sec
 *  3. Each arriving character pops in with a scale punch (1.35 → 1.0)
 *  4. Blinking cursor sits at end: solid while typing, blinks after
 *  5. Subtitle slides + fades up after typing finishes
 */
export const FusionKeyword: React.FC<FusionKeywordProps> = ({
  word,
  subtitle,
  accentColor = '#7B4FFF',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chars = word.split('');
  // ~2.5 frames per character  →  ~12 chars/sec
  const FRAMES_PER_CHAR = 2.5;
  const typeIdx = Math.min(chars.length, Math.floor(frame / FRAMES_PER_CHAR));
  const typingDone = typeIdx >= chars.length;

  // Whole-scene zoom-out: 1.05 → 1.0 over first 50 frames (Codex pull-back)
  const sceneZoom = interpolate(frame, [0, 50], [1.05, 1.0], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateRight: 'clamp',
  });

  // Cursor blink: solid while typing, alternates every 10 frames after
  const cursorOpacity = typingDone ? (Math.floor(frame / 10) % 2 === 0 ? 1 : 0) : 1;

  // Subtitle springs in after typing completes + 8-frame buffer
  const subDelay = Math.ceil(chars.length * FRAMES_PER_CHAR) + 8;
  const subProg = spring({
    frame: frame - subDelay,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#E8EDF2',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 28,
        fontFamily: 'Inter, -apple-system, sans-serif',
        // Slow zoom-out on the whole scene
        transform: `scale(${sceneZoom})`,
        transformOrigin: 'center center',
      }}
    >
      {/* ── Keyword row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          fontSize: 178,
          fontWeight: 800,
          color: accentColor,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {/* Characters that have typed in */}
        {chars.slice(0, typeIdx).map((char, i) => {
          // Age in frames since this character appeared
          const charAge = frame - i * FRAMES_PER_CHAR;
          // Pop scale: 1.35 → 1.0 over 8 frames, then holds
          const charScale = interpolate(charAge, [0, 8], [1.35, 1.0], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `scale(${charScale})`,
                // Slight upward shift on arrival, settles to 0
                marginTop: interpolate(charAge, [0, 8], [-8, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}

        {/* Blinking cursor */}
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: '0.82em',
            background: accentColor,
            marginLeft: 8,
            verticalAlign: 'middle',
            borderRadius: 2,
            opacity: cursorOpacity,
            // Pulse scale when cursor is idle (after typing)
            transform: typingDone ? 'scaleY(1)' : 'scaleY(1)',
          }}
        />
      </div>

      {/* ── Subtitle ────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 32,
          color: '#6b7280',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          opacity: subProg,
          transform: `translateY(${interpolate(subProg, [0, 1], [22, 0])}px)`,
          textAlign: 'center',
          maxWidth: 840,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
