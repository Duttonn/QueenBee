/**
 * Queen Bee API Service Layer
 * Connects the frontend UI to the proxy-bridge backend
 */

// Backend base URL - defaults to localhost in dev
export const API_BASE = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://127.0.0.1:3000';

export interface ToolCall {
    id: string;
    name: string;
    arguments: any;
    status: 'pending' | 'running' | 'success' | 'error' | 'rejected';
    result?: any;
    error?: string;
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    toolCalls?: ToolCall[];
}

export interface DiffStats {
    added: number;
    removed: number;
    files: Array<{
        path: string;
        stats: { added: number; removed: number };
        hunks: Array<{ header: string; lines: string[] }>;
    }>;
}

export interface ChatRequest {
    model: string;
    messages: Message[];
    stream?: boolean;
    provider?: 'gemini' | 'nvidia' | 'ollama' | 'mock' | 'openai' | 'anthropic';
    apiKey?: string;
    projectPath?: string;
    threadId?: string;
    mode?: 'local' | 'worktree' | 'cloud';
    agentId?: string;
}

/**
 * Send a chat message to the AI provider
 */
export async function sendChatMessage(request: ChatRequest): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Codex-Provider': request.provider || 'mock',
    };

    // Add API key to headers if provided
    if (request.apiKey) {
        headers['Authorization'] = `Bearer ${request.apiKey}`;
    }

    const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            stream: request.stream || false,
            projectPath: request.projectPath,
            threadId: request.threadId,
            mode: request.mode,
            agentId: request.agentId
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat request failed');
    }

    return response.json();
}

/**
 * Send a chat message to the AI provider and stream the response
 */
export async function sendChatMessageStream(
    request: ChatRequest,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    onEvent?: (event: { type: string; data: any }) => void
): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Codex-Provider': request.provider || 'mock',
    };

    if (request.apiKey) {
        headers['Authorization'] = `Bearer ${request.apiKey}`;
    }

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                stream: true,
                projectPath: request.projectPath,
                threadId: request.threadId,
                mode: request.mode,
                agentId: request.agentId
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Chat request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) {
            throw new Error('Response body is null');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // SSE parsing - supports multiple formats:
            // 1. OpenAI format: data: {"choices": [{"delta": {"content": "..."}}]}
            // 2. Queen Bee/Gemini format: data: {"content": "..."}
            // 3. Tool call format: data: {"tool_calls": [...]}
            // 4. Vertical Agent events: data: {"type": "tool_start", "data": {...}}
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const payload = line.substring(6).trim();
                    if (payload === '[DONE]') continue;

                    try {
                        const data = JSON.parse(payload);

                        // Check for errors first
                        if (data.error) {
                            onError(new Error(data.error.message || 'Stream error'));
                            return;
                        }

                        // Handle Agent Events (tool_start, tool_end, step_start, etc)
                        if (data.type && data.type !== 'message' && onEvent) {
                            onEvent(data);
                        }

                        // Try OpenAI format first
                        let content = data.choices?.[0]?.delta?.content;

                        // Fallback to direct content (Queen Bee/Gemini format)
                        if (!content && data.content) {
                            content = data.content;
                        }

                        // Fallback to AgentSession format
                        if (!content && data.type === 'message' && data.data?.content) {
                            content = data.data.content;
                        }

                        if (content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Not JSON, might be raw text or partial chunk
                    }
                }
            }
        }

        onComplete(fullText);
    } catch (error: any) {
        onError(error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Get git diff for a project
 */
export async function getGitDiff(projectPath: string, filePath?: string): Promise<DiffStats> {
    const params = new URLSearchParams({ projectPath });
    if (filePath) params.append('filePath', filePath);

    const response = await fetch(`${API_BASE}/api/git/diff?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get diff');
    }

    return response.json();
}

/**
 * Execute a shell command (one-shot)
 */
export async function executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; error?: string }> {
    const response = await fetch(`${API_BASE}/api/execution/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd }),
    });

    return response.json();
}

/**
 * Get terminal WebSocket URL for real-time PTY
 */
export function getTerminalSocketUrl(): string {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    return `${wsBase}/api/terminal/socket`;
}

/**
 * Create a new worktree for feature development
 */
export async function createWorktree(projectId: string, featureName: string, sourcePath: string): Promise<{ path: string; branch: string }> {
    const response = await fetch(`${API_BASE}/api/git/worktree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            path: sourcePath,
            name: featureName 
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create worktree');
    }

    const data = await response.json();
    return {
        path: data.path,
        branch: data.branch
    };
}

/**
 * Ship worktree to Git forge (GitHub/GitLab)
 */
export async function shipWorktree(treePath: string, repoPath: string, prTitle: string, prBody: string): Promise<{ prUrl: string }> {
    const response = await fetch(`${API_BASE}/api/workflow/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treePath, repoPath, prTitle, prBody }),
    });

    if (!response.ok) {
        throw new Error('Failed to ship worktree');
    }

    return response.json();
}

/**
 * Get list of active projects and their agents
 */
export async function getProjects(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/api/projects`);
    if (!response.ok) return [];
    return response.json();
}

/**
 * Health check for the backend
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
}
