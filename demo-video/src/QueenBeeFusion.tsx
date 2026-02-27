import React from 'react';
import { AbsoluteFill, Series, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { FusionHero }       from './scenes/FusionHero';
import { FusionKeyword }    from './scenes/FusionKeyword';
import { FusionParallel }   from './scenes/FusionParallel';
import { FusionDiff }       from './scenes/FusionDiff';
import { FusionEvolution }  from './scenes/FusionEvolution';
import { FusionMemory }     from './scenes/FusionMemory';
import { FusionSafety }     from './scenes/FusionSafety';
import { FusionCompare }    from './scenes/FusionCompare';
import { FusionCTA }        from './scenes/FusionCTA';

// ─────────────────────────────────────────────────────────────────────────────
// QueenBee Fusion Demo  —  1800 frames @ 30 fps  ≈  60 s (+20%)
//
//  #   Scene                  Start   Dur    Notes
//  ─   ─────────────────────  ─────   ───    ─────
//  1   FusionHero             0       72     Dark opening
//  2   Keyword "parallel."    72      72     Light, typing animation
//  3   FusionParallel         144     324    Two agents, hero demo
//  4   FusionDiff             468     180    Code diff / git review
//  5   Keyword "smarter."     648     72     Light, typing
//  6   FusionEvolution        720     180    Learns your codebase over time
//  7   Keyword "remembers."   900     90     Light, typing
//  8   FusionMemory           990     216    Session memory
//  9   Keyword "safe."        1206    90     Light, typing
// 10   FusionSafety           1296    180    Policy + Slack approval
// 11   Keyword "yours."       1476    72     Light, typing
// 12   FusionCompare          1548    144    Product card comparison
// 13   FusionCTA              1692    108    Final call-to-action
//
//  Total: 1800 frames
// ─────────────────────────────────────────────────────────────────────────────

const FLASH_L = 14; // frames — dark ↔ light boundary
const FLASH_S =  8; // frames — dark ↔ dark (quick cut)

/**
 * Full-screen colour flash that peaks at its midpoint.
 * Rendered inside a <Sequence> so `useCurrentFrame` is always 0-based.
 */
const FusionFlash: React.FC<{ color: string; dur: number }> = ({ color, dur }) => {
  const frame = useCurrentFrame();
  const mid   = Math.floor(dur / 2);
  const opacity = interpolate(frame, [0, mid, dur], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{ background: color, opacity, zIndex: 9999, pointerEvents: 'none' }}
    />
  );
};

export const QueenBeeFusion: React.FC = () => {
  return (
    <AbsoluteFill>

      {/* ── Scene layer ────────────────────────────────────────────── */}
      <Series>

        {/* 1 — Dark opening hero */}
        <Series.Sequence durationInFrames={72}>
          <FusionHero />
        </Series.Sequence>

        {/* 2 — "parallel." */}
        <Series.Sequence durationInFrames={72}>
          <FusionKeyword
            word="parallel."
            subtitle="Two agents. One goal. Half the time."
          />
        </Series.Sequence>

        {/* 3 — Two agents running simultaneously */}
        <Series.Sequence durationInFrames={324}>
          <FusionParallel />
        </Series.Sequence>

        {/* 4 — Code diff review */}
        <Series.Sequence durationInFrames={180}>
          <FusionDiff />
        </Series.Sequence>

        {/* 5 — "smarter." */}
        <Series.Sequence durationInFrames={72}>
          <FusionKeyword
            word="smarter."
            subtitle="Every session makes it better at your codebase."
            accentColor="#7B4FFF"
          />
        </Series.Sequence>

        {/* 6 — Evolution / self-improvement */}
        <Series.Sequence durationInFrames={180}>
          <FusionEvolution />
        </Series.Sequence>

        {/* 7 — "remembers." */}
        <Series.Sequence durationInFrames={90}>
          <FusionKeyword
            word="remembers."
            subtitle="Context that persists across every session."
            accentColor="#22c55e"
          />
        </Series.Sequence>

        {/* 8 — Session memory */}
        <Series.Sequence durationInFrames={216}>
          <FusionMemory />
        </Series.Sequence>

        {/* 9 — "safe." */}
        <Series.Sequence durationInFrames={90}>
          <FusionKeyword
            word="safe."
            subtitle="Policy rules enforced before every risky command."
            accentColor="#f59e0b"
          />
        </Series.Sequence>

        {/* 10 — Safety + Slack approval */}
        <Series.Sequence durationInFrames={180}>
          <FusionSafety />
        </Series.Sequence>

        {/* 11 — "yours." */}
        <Series.Sequence durationInFrames={72}>
          <FusionKeyword
            word="yours."
            subtitle="Self-hosted. Open source. No lock-in. Flat pricing."
            accentColor="#111"
          />
        </Series.Sequence>

        {/* 12 — Product comparison card */}
        <Series.Sequence durationInFrames={144}>
          <FusionCompare />
        </Series.Sequence>

        {/* 13 — Final CTA */}
        <Series.Sequence durationInFrames={108}>
          <FusionCTA />
        </Series.Sequence>

      </Series>

      {/* ── Transition flash overlay layer ─────────────────────────── */}
      {/*
        Flashes are centered on scene boundaries (updated +20%).
        from = boundary − floor(dur/2)

         72   Hero(dark)      → Keyword(light)    light #E8EDF2
        144   Keyword(light)  → Parallel(dark)    dark  #05030c
        468   Parallel(dark)  → Diff(dark)         black cut
        648   Diff(dark)      → Keyword(light)    light #E8EDF2
        720   Keyword(light)  → Evolution(dark)   dark  #05030c
        900   Evolution(dark) → Keyword(light)    light #E8EDF2
        990   Keyword(light)  → Memory(dark)      dark  #05030c
       1206   Memory(dark)    → Keyword(light)    light #E8EDF2
       1296   Keyword(light)  → Safety(dark)      dark  #05030c
       1476   Safety(dark)    → Keyword(light)    light #E8EDF2
       1548   Keyword(light)  → Compare(light)    white #ffffff
       1692   Compare(light)  → CTA(dark)         dark  #05030c
      */}

      <Sequence from={72   - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#E8EDF2" dur={FLASH_L} />
      </Sequence>
      <Sequence from={144  - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#05030c" dur={FLASH_L} />
      </Sequence>
      <Sequence from={468  - FLASH_S / 2} durationInFrames={FLASH_S}>
        <FusionFlash color="#000000" dur={FLASH_S} />
      </Sequence>
      <Sequence from={648  - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#E8EDF2" dur={FLASH_L} />
      </Sequence>
      <Sequence from={720  - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#05030c" dur={FLASH_L} />
      </Sequence>
      <Sequence from={900  - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#E8EDF2" dur={FLASH_L} />
      </Sequence>
      <Sequence from={990  - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#05030c" dur={FLASH_L} />
      </Sequence>
      <Sequence from={1206 - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#E8EDF2" dur={FLASH_L} />
      </Sequence>
      <Sequence from={1296 - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#05030c" dur={FLASH_L} />
      </Sequence>
      <Sequence from={1476 - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#E8EDF2" dur={FLASH_L} />
      </Sequence>
      <Sequence from={1548 - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#ffffff" dur={FLASH_L} />
      </Sequence>
      <Sequence from={1692 - FLASH_L / 2} durationInFrames={FLASH_L}>
        <FusionFlash color="#05030c" dur={FLASH_L} />
      </Sequence>

    </AbsoluteFill>
  );
};
