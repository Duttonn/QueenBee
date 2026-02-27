import React from 'react';
import { Composition } from 'remotion';
import { QueenBeeDemo } from './QueenBeeDemo';
import { QueenBeeFusion } from './QueenBeeFusion';
import { Scene08DeviceDemo } from './scenes/Scene08DeviceDemo';

export const Root: React.FC = () => {
  return (
    <>
      {/* Fusion Demo — 1800 frames ≈ 60 s */}
      <Composition
        id="QueenBeeFusion"
        component={QueenBeeFusion}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Original Demo */}
      <Composition
        id="QueenBeeDemo"
        component={QueenBeeDemo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Mobile Device Demo with Safe Zones - TikTok/Reels format */}
      <Composition
        id="QueenBeeDemoMobile"
        component={Scene08DeviceDemo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
