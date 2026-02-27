import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Dynamic data types for QueenBee app
export interface RecipeData {
  id: string;
  title: string;
  titleTamil?: string;
  titleHindi?: string;
  titleArabic?: string;
  ingredients: string[];
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl: string;
}

export interface AgentTask {
  id: string;
  type: 'api' | 'ui' | 'test';
  status: 'pending' | 'working' | 'completed';
  progress: number;
  message: string;
}

export interface MemorySession {
  date: string;
  dayName: string;
  knowledge: number;
  patterns: string[];
}

// Mock API data - in production, this would come from actual API calls
export const MOCK_RECIPES: Record<string, RecipeData> = {
  en: {
    id: 'recipe-001',
    title: 'Tamil Chicken Curry',
    ingredients: ['Chicken', 'Tamil Spices', 'Coconut Milk', 'Curry Leaves'],
    duration: 45,
    difficulty: 'medium',
    imageUrl: '/recipes/curry.jpg',
  },
  ta: {
    id: 'recipe-002',
    title: 'சுண்டல்',
    titleTamil: 'Sambar',
    ingredients: ['Toor Dal', 'Vegetables', 'Tamarind', 'Curry Leaves'],
    duration: 40,
    difficulty: 'easy',
    imageUrl: '/recipes/sambar.jpg',
  },
  hi: {
    id: 'recipe-003',
    title: 'पुलाव',
    titleHindi: 'Biryani',
    ingredients: ['Basmati Rice', 'Spices', 'Mutton', 'Saffron'],
    duration: 90,
    difficulty: 'hard',
    imageUrl: '/recipes/biryani.jpg',
  },
};

export const MOCK_TASKS: AgentTask[] = [
  { id: 'task-1', type: 'api', status: 'working', progress: 65, message: 'Building REST endpoints' },
  { id: 'task-2', type: 'ui', status: 'working', progress: 45, message: 'Building components' },
  { id: 'task-3', type: 'test', status: 'working', progress: 80, message: 'Writing tests' },
];

export const MOCK_SESSIONS: MemorySession[] = [
  { date: '2024-01-16', dayName: 'Tuesday', knowledge: 45, patterns: ['auth-patterns', 'api-structure'] },
  { date: '2024-01-18', dayName: 'Thursday', knowledge: 72, patterns: ['auth-patterns', 'api-structure', 'react-hooks'] },
  { date: '2024-01-20', dayName: 'Today', knowledge: 95, patterns: ['auth-patterns', 'api-structure', 'react-hooks', 'testing-patterns'] },
];

// Hook for dynamic text typing effect (simulating LLM streaming)
export const useTextReveal = (text: string, startFrame: number, speed: number = 2) => {
  const frame = useCurrentFrame();
  
  const visibleChars = Math.max(0, Math.floor((frame - startFrame) / speed));
  const displayText = text.slice(0, visibleChars);
  const isComplete = visibleChars >= text.length;
  
  return { displayText, isComplete };
};

// Hook for animated progress bars
export const useProgressAnimation = (targetProgress: number, startFrame: number) => {
  const frame = useCurrentFrame();
  
  const progress = Math.min(
    targetProgress,
    Math.max(0, ((frame - startFrame) / 30) * targetProgress)
  );
  
  return progress;
};

// Hook for scrolling content simulation
export const useScrollAnimation = (
  contentHeight: number,
  containerHeight: number,
  startFrame: number,
  duration: number
) => {
  const frame = useCurrentFrame();
  
  const scrollProgress = Math.min(
    1,
    Math.max(0, (frame - startFrame) / duration)
  );
  
  const maxScroll = Math.max(0, contentHeight - containerHeight);
  const translateY = scrollProgress * maxScroll;
  
  return { translateY, scrollProgress };
};

// Calculate dynamic duration based on content length (per research document)
export const calculateDynamicDuration = (
  baseDuration: number,
  contentLength: number,
  readingSpeed: number = 15 // chars per frame
): number => {
  const additionalFrames = Math.ceil(contentLength / readingSpeed);
  return baseDuration + additionalFrames;
};

// Data hydration function - simulates fetching from API
export const hydrateVideoData = async (locale: string = 'en') => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    recipe: MOCK_RECIPES[locale] || MOCK_RECIPES['en'],
    tasks: MOCK_TASKS,
    sessions: MOCK_SESSIONS,
  };
};

// Typewriter effect component helper
export const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, speed = 2, style }) => {
  const { displayText } = useTextReveal(text, startFrame, speed);
  
  return (
    <span style={style}>
      {displayText}
      <span style={{ opacity: 0.5 }}>|</span>
    </span>
  );
};

// Animated checkbox for task lists
export const AnimatedCheckbox: React.FC<{
  checked: boolean;
  frame: number;
  x: number;
  y: number;
}> = ({ checked, frame, x, y }) => {
  const { fps } = useVideoConfig();
  
  const checkProgress = Math.min(1, Math.max(0, (frame - 20) / 15));
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 24,
        height: 24,
        borderRadius: 6,
        border: '2px solid #22c55e',
        backgroundColor: checked ? '#22c55e' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          style={{
            width: '100%',
            height: '100%',
            strokeDasharray: 30,
            strokeDashoffset: 30 * (1 - checkProgress),
            transition: 'stroke-dashoffset 0.3s ease',
          }}
        >
          <path
            d="M5 12l5 5L20 7"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
};
