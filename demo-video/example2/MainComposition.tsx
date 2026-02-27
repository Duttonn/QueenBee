import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Sequence, Spring, Easing } from 'remotion';

// Thème centralisé pour faciliter la personnalisation
const theme = {
  colors: {
    background: '#FFFFFF',
    sidebarBackground: '#F8F8F8',
    borderColor: '#E0E0E0',
    textColor: '#333333',
    secondaryTextColor: '#666666',
    accentColor: '#007AFF', // Bleu pour les éléments actifs
    diffAdded: '#EEFFEE', // Vert clair pour les ajouts
    diffRemoved: '#FFEEEE', // Rouge clair pour les suppressions
  },
  borderRadius: {
    window: '10px',
    card: '8px',
    button: '4px',
    input: '12px',
  },
  shadows: {
    window: '0px 8px 20px rgba(0, 0, 0, 0.1)',
    card: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    input: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    monospace: 'SF Mono, Fira Code, monospace',
  },
};

// Composant pour le fond d'écran flou (simulé)
const BlurredBackground: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#D6E0F0', // Un bleu/violet doux pour simuler le fond macOS
        filter: 'blur(20px)', // Flou gaussien
      }}
    />
  );
};

// Composant Sidebar
const Sidebar: React.FC<{ activeItem: string }> = ({ activeItem }) => {
  const items = [
    { id: 'newThread', label: 'New thread', icon: '📄' },
    { id: 'automations', label: 'Automations', icon: '⚙️' },
    { id: 'skills', label: 'Skills', icon: '💡' },
  ];
  const threads = [
    { id: 'recipe-app', label: 'recipe-app' },
    { id: 'mySkills', label: 'My Skills skills' },
    { id: 'photobooth', label: 'photobooth', active: true },
    { id: 'developersWebsite', label: 'developers-website' },
  ];

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        backgroundColor: theme.colors.sidebarBackground,
        borderRight: `1px solid ${theme.colors.borderColor}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.typography.fontFamily,
        fontSize: '14px',
        color: theme.colors.secondaryTextColor,
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 10px',
              borderRadius: theme.borderRadius.button,
              backgroundColor: activeItem === item.id ? theme.colors.borderColor : 'transparent',
              cursor: 'pointer',
              marginBottom: '5px',
            }}
          >
            <span style={{ marginRight: '10px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 'bold', color: theme.colors.textColor, marginBottom: '10px' }}>Threads</div>
      {threads.map((thread) => (
        <div
          key={thread.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: theme.borderRadius.button,
            backgroundColor: thread.active ? theme.colors.borderColor : 'transparent',
            cursor: 'pointer',
            marginBottom: '5px',
          }}
        >
          <span style={{ marginRight: '10px' }}>📁</span>
          <span>{thread.label}</span>
          {thread.active && <span style={{ marginLeft: 'auto', color: theme.colors.accentColor }}>✓</span>}
        </div>
      ))}
    </div>
  );
};

// Composant Header
const Header: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div
      style={{
        height: '50px',
        borderBottom: `1px solid ${theme.colors.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
        fontFamily: theme.typography.fontFamily,
        color: theme.colors.secondaryTextColor,
        fontSize: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF605C' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FFBD44' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00CA4E' }} />
        <span style={{ marginLeft: '15px' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          style={{
            padding: '5px 10px',
            borderRadius: theme.borderRadius.button,
            border: `1px solid ${theme.colors.borderColor}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.textColor,
            cursor: 'pointer',
          }}
        >
          Open
        </button>
        <button
          style={{
            padding: '5px 10px',
            borderRadius: theme.borderRadius.button,
            border: `1px solid ${theme.colors.borderColor}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.textColor,
            cursor: 'pointer',
          }}
        >
          Commit
        </button>
      </div>
    </div>
  );
};

// Composant InputBar
const InputBar: React.FC<{ text: string; showCursor: boolean; progress: number }> = ({ text, showCursor, progress }) => {
  const displayedText = text.slice(0, Math.floor(progress * text.length));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: '800px',
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.borderColor}`,
        borderRadius: theme.borderRadius.input,
        padding: '10px 20px',
        boxShadow: theme.shadows.input,
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        fontFamily: theme.typography.fontFamily,
        color: theme.colors.secondaryTextColor,
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <span>{displayedText}</span>
        {showCursor && (
          <span
            style={{
              width: '2px',
              height: '1em',
              backgroundColor: theme.colors.textColor,
              marginLeft: '2px',
              animation: 'blink 1s step-end infinite',
            }}
          />
        )}
        <style>
          {`
            @keyframes blink {
              from, to { opacity: 0; }
              50% { opacity: 1; }
            }
          `}
        </style>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: theme.colors.secondaryTextColor }}>GPT-5.2-Codex</span>
        <span style={{ fontSize: '18px', color: theme.colors.secondaryTextColor }}>🎤</span>
        <span style={{ fontSize: '18px', color: theme.colors.secondaryTextColor }}>⬆️</span>
      </div>
    </div>
  );
};

// Composant CodeDiff
const CodeDiff: React.FC<{ code: string[]; progress: number }> = ({ code, progress }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: theme.typography.monospace,
        fontSize: '14px',
        lineHeight: '1.5',
        backgroundColor: theme.colors.background,
        height: '100%',
        overflow: 'hidden',
        color: theme.colors.textColor,
      }}
    >
      <div style={{ color: theme.colors.secondaryTextColor, marginBottom: '10px' }}>app/api/generate/route.ts +1 -1</div>
      <div style={{ backgroundColor: theme.colors.sidebarBackground, padding: '10px', borderRadius: theme.borderRadius.button }}>
        {code.map((line, index) => {
          const lineProgress = interpolate(frame, [index * 2, index * 2 + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          let backgroundColor = 'transparent';
          let color = theme.colors.secondaryTextColor;

          if (line.startsWith('+')) {
            backgroundColor = theme.colors.diffAdded;
            color = '#008000';
          } else if (line.startsWith('-')) {
            backgroundColor = theme.colors.diffRemoved;
            color = '#CC0000';
          }

          return (
            <div
              key={index}
              style={{
                backgroundColor: backgroundColor,
                color: color,
                opacity: lineProgress,
                transform: `translateY(${interpolate(lineProgress, [0, 1], [10, 0])}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant FloatingWindow
const FloatingWindow: React.FC<{ show: boolean }> = ({ show }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spring = Spring({ frame, from: 0, to: 1, config: { stiffness: 100, damping: 10, mass: 1 }, fps });

  const opacity = show ? spring : 0;
  const translateY = show ? interpolate(spring, [0, 1], [20, 0]) : 20;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100px',
        right: '100px',
        width: '300px',
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.borderColor}`,
        borderRadius: theme.borderRadius.input,
        boxShadow: theme.shadows.window,
        padding: '15px',
        fontFamily: theme.typography.fontFamily,
        opacity: opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', color: theme.colors.textColor }}>Photobooth polish</div>
        <div style={{ color: theme.colors.secondaryTextColor, cursor: 'pointer' }}>✕</div>
      </div>
      <div style={{ fontSize: '13px', color: theme.colors.textColor }}>
        Done — removed the subtitle under the heading. npm run build passes.
      </div>
    </div>
  );
};

// Composant principal de la composition Remotion
export const MainComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animations de transition
  const windowEnterProgress = interpolate(frame, [0, 30], [0, 1], { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const windowTranslateY = interpolate(windowEnterProgress, [0, 1], [20, 0]);
  const windowOpacity = windowEnterProgress;

  const textTypingProgress = interpolate(frame, [35, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const inputBarTypingProgress = interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const codeDiff = [
    '101 const captionPromise = client.responses',
    '102 .create({',
    '103 - model: "gpt-5-nano",',
    '103 + model: "gpt-5.2",',
    '104 instructions:',
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
      <BlurredBackground />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${windowTranslateY}px)`,
          opacity: windowOpacity,
          width: '90%',
          height: '90%',
          maxWidth: '1600px',
          maxHeight: '900px',
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.window,
          boxShadow: theme.shadows.window,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Sidebar */}
        <Sequence from={0} durationInFrames={durationInFrames}>
          <Sidebar activeItem="photobooth" />
        </Sequence>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Header */}
          <Sequence from={0} durationInFrames={durationInFrames}>
            <Header title="Add drag and drop to gallery photos photobooth" />
          </Sequence>

          {/* Home Screen / Initial View */}
          <Sequence from={0} durationInFrames={100}>
            <AbsoluteFill
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                gap: '20px',
                opacity: interpolate(frame, [0, 30, 90, 100], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.textColor }}>
                Let's build photobooth
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div
                  style={{
                    padding: '15px',
                    border: `1px solid ${theme.colors.borderColor}`,
                    borderRadius: theme.borderRadius.card,
                    width: '200px',
                    textAlign: 'center',
                    boxShadow: theme.shadows.card,
                    color: theme.colors.textColor,
                  }}
                >
                  Create a classic snake game
                </div>
                <div
                  style={{
                    padding: '15px',
                    border: `1px solid ${theme.colors.borderColor}`,
                    borderRadius: theme.borderRadius.card,
                    width: '200px',
                    textAlign: 'center',
                    boxShadow: theme.shadows.card,
                    color: theme.colors.textColor,
                  }}
                >
                  Find and fix a bugs in my code
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>

          {/* Code Diff View */}
          <Sequence from={100} durationInFrames={durationInFrames - 100}>
            <CodeDiff code={codeDiff} progress={interpolate(frame, [100, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
          </Sequence>

          {/* Input Bar */}
          <Sequence from={0} durationInFrames={durationInFrames}>
            <InputBar
              text="Ask Codex anything, @ to add files, / for commands"
              showCursor={frame > 115 && frame < 150 && Math.floor(frame / 5) % 2 === 0} // Simule le clignotement du curseur
              progress={inputBarTypingProgress}
            />
          </Sequence>

          {/* Floating Window */}
          <Sequence from={160} durationInFrames={durationInFrames - 160}>
            <FloatingWindow show={true} />
          </Sequence>
        </div>
      </div>
    </AbsoluteFill>
  );
};
