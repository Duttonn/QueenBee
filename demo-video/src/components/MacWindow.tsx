import React from 'react';
import { AbsoluteFill } from 'remotion';

export const MacWindow: React.FC<{
  children: React.ReactNode;
  scale?: number;
  yOffset?: number;
  opacity?: number;
}> = ({ children, scale = 1, yOffset = 0, opacity = 1 }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        transform: `scale(${scale}) translateY(${yOffset}px)`,
        opacity,
      }}
    >
        <div
        className="bg-white rounded-3xl overflow-hidden flex flex-col relative"
        style={{
          width: 1728,
          height: 1032,
          boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 30px 60px -30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div className="h-14 bg-[#e8e8e8] flex items-center px-5 border-b border-zinc-200/50 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md z-50">
          <div className="flex gap-2.5">
            <div className="w-4 h-4 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-inner" />
            <div className="w-4 h-4 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-inner" />
            <div className="w-4 h-4 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-inner" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[#8c8c8c] text-sm font-semibold tracking-wide">
              QueenBee
            </span>
          </div>
        </div>
        <div className="flex-1 flex bg-white relative overflow-hidden text-zinc-900">
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
