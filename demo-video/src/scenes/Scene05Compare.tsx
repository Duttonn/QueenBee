import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MacWindow } from '../components/MacWindow';
import { AppUI } from '../components/AppUI';
import { TextCallout } from '../components/TextCallout';

export const Scene05Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <TextCallout text="The New Standard" subtext="Built for local workflows." position="top" delay={15} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${0.9 + progress * 0.1}) translateY(${(1 - progress) * 20}px)`,
          opacity: progress,
        }}
      >
        <div className="w-[1000px] bg-white rounded-3xl border border-zinc-200 shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden p-10 font-sans">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="py-4 px-6 text-lg text-zinc-600 font-bold uppercase tracking-widest text-[12px]">Feature</th>
                <th className="py-4 px-6 text-2xl text-amber-500 font-black">QueenBee</th>
                <th className="py-4 px-6 text-lg text-zinc-400 font-bold">Codex</th>
                <th className="py-4 px-6 text-lg text-zinc-400 font-bold">Cursor</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Swarms (Parallel Agents)', qb: '✅ Yes (Local)', cd: '❌ No', cr: '❌ No' },
                { feature: 'Evolution Directives (Memory)', qb: '✅ Persistent', cd: '❌ Session only', cr: '❌ No' },
                { feature: 'Internet Access / Fetch Docs', qb: '✅ Yes', cd: '❌ Disabled', cr: '✅ Yes' },
                { feature: 'Local First (No Cloud Lock-in)', qb: '✅ Yes', cd: '❌ Cloud Only', cr: '❌ Hybrid' },
                { feature: 'Customizable Agent Logic', qb: '✅ Full Control', cd: '❌ No', cr: '❌ No' },
              ].map((row, i) => (
                <tr key={i} className={`border-b border-zinc-200 ${i % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'}`}>
                  <td className="py-5 px-6 text-base text-zinc-900 font-bold">{row.feature}</td>
                  <td className="py-5 px-6 text-base text-green-600 font-black tracking-wide">{row.qb}</td>
                  <td className="py-5 px-6 text-base text-zinc-500 font-medium">{row.cd}</td>
                  <td className="py-5 px-6 text-base text-zinc-500 font-medium">{row.cr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
