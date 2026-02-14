# AI Agent Research

## Overview
Research findings on multi-agent architectures, memory systems, and model dispatching.

## 1. Rowboat - AI Coworker with Knowledge Graphs

### Architecture
- **Knowledge Graph Integration**: Uses graph databases for entity relationships
- **Context Awareness**: Maintains long-term memory of user preferences and project context
- **Collaborative Problem Solving**: Multiple agents can work on shared problems

### Implementation Patterns
```typescript
interface KnowledgeNode {
  id: string;
  type: 'project' | 'file' | 'concept' | 'user';
  properties: Record<string, any>;
  edges: string[];
}
```

## 2. Agent Lightning - Microsoft RL Training

### Key Concepts
- **Reinforcement Learning**: Agents learn from environment feedback
- **Reward Shaping**: Designing effective reward functions
- **Policy Optimization**: Continuous improvement of decision-making

### Application to QueenBee
- Use task success/failure as rewards
- Track agent performance metrics
- Implement self-improvement loops

## 3. RLM - Recursive Language Models (MIT)

### Core Innovation
- **Recursive Context**: Models can call themselves for deeper analysis
- **Lazy Loading**: Only load context when needed
- **Token Efficiency**: Reduce context window pressure

### Implementation: LazyFileLoader
```typescript
class LazyFileLoader {
  private cache: Map<string, FileContent> = new Map();
  
  async load(request: FileLoadRequest): Promise<FileContent> {
    const cached = this.cache.get(request.path);
    if (cached) return cached;
    // Load on-demand
  }
}
```

## 4. Mastra - TypeScript AI Framework

### Observational Memory Pattern
- **Observer Agent**: Monitors system state and actions
- **Reflector Agent**: Analyzes patterns and generates insights
- **Memory Distillation**: Compresses observations into actionable learnings

### Implementation: ObservationalMemory
```typescript
class ObservationalMemory {
  async observe(type, content, context, tags) {
    // Store observation
  }
  
  async reflect(insight, confidence) {
    // Generate reflection from observations
  }
  
  private async performReflection() {
    // Auto-detect patterns
  }
}
```

## 5. Model Council - Weighted Dispatch

### Concept
- Multiple models with weighted selection
- Capability-based routing
- Automatic fallback on failure
- Complexity-based model selection

### Implementation: WeightedModelDispatcher
- **Weight-based selection**: Random weighted choice
- **Capability matching**: Match task requirements to model strengths
- **Fallback chain**: Automatic retry with different models

### Default Configuration
```
Opus 4.6:   40% (reasoning, code, analysis)
Gemini 2:   20% (reasoning, vision, creative)  
GPT-5:      10% (code, fast)
Haiku:      30% (fast)
```

## 6. Memory Types

### Working Memory
- **Scope**: Per-task/thread
- **Duration**: Task lifetime
- **Implementation**: In-memory Map

### Observational Memory
- **Scope**: Project-wide
- **Duration**: Persistent (with pruning)
- **Implementation**: File-based with JSON

### Context Memory
- **Scope**: Session-based
- **Duration**: User session
- **Implementation**: Session storage

## 7. Best Practices

1. **Lazy Loading**: Only load what's needed
2. **Memory Pruning**: Prevent unbounded growth
3. **Pattern Detection**: Auto-generate insights
4. **Fallback Strategies**: Graceful degradation
5. **Weighted Selection**: Optimize cost/performance
