import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { Scene01Hero } from './scenes/Scene01Hero';
import { Scene02Problem } from './scenes/Scene02Problem';
import { Scene03Swarm } from './scenes/Scene03Swarm';
import { Scene04Diff } from './scenes/Scene04Diff';
import { Scene02Feature1 } from './scenes/Scene02Feature1';
import { Scene03Feature2 } from './scenes/Scene03Feature2';
import { Scene04Feature3 } from './scenes/Scene04Feature3';
import { Scene05Safety } from './scenes/Scene05Safety';
import { Scene06Compare } from './scenes/Scene06Compare';
import { Scene07CTA } from './scenes/Scene07CTA';
import { Scene08DeviceDemo } from './scenes/Scene08DeviceDemo';

const VideoBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  </AbsoluteFill>
);

export const QueenBeeDemo: React.FC = () => {
  return (
    <AbsoluteFill>
      <VideoBackground />
      <Series>
        {/* Scene 1: Hero - Logo and tagline */}
        <Series.Sequence durationInFrames={90}>
          <Scene01Hero />
        </Series.Sequence>

        {/* UI Interaction 1: Point to the issue */}
        <Series.Sequence durationInFrames={180}>
          <Scene02Problem />
        </Series.Sequence>

        {/* UI Interaction 2: The Swarm takes over */}
        <Series.Sequence durationInFrames={180}>
          <Scene03Swarm />
        </Series.Sequence>

        {/* Feature: Parallel Agents */}
        <Series.Sequence durationInFrames={150}>
          <Scene02Feature1 />
        </Series.Sequence>

        {/* UI Interaction 3: Review and commit */}
        <Series.Sequence durationInFrames={150}>
          <Scene04Diff />
        </Series.Sequence>

        {/* Feature: Worktrees */}
        <Series.Sequence durationInFrames={150}>
          <Scene04Feature3 />
        </Series.Sequence>

        {/* Feature: Memory */}
        <Series.Sequence durationInFrames={150}>
          <Scene03Feature2 />
        </Series.Sequence>

        {/* Feature: Safety */}
        <Series.Sequence durationInFrames={150}>
          <Scene05Safety />
        </Series.Sequence>

        {/* Feature: Comparison */}
        <Series.Sequence durationInFrames={150}>
          <Scene06Compare />
        </Series.Sequence>

        {/* CTA */}
        <Series.Sequence durationInFrames={90}>
          <Scene07CTA />
        </Series.Sequence>

        {/* Device Demo - Phone mockup with AI interface */}
        <Series.Sequence durationInFrames={120}>
          <Scene08DeviceDemo />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
