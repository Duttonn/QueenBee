/**
 * Queen Bee API Service Layer
 * Connects the frontend UI to the proxy-bridge backend
 */

// Backend base URL - defaults to localhost in dev
const API_BASE = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://127.0.0.1:3000';

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
    onError: (error: Error) => void
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
            
            // SSE parsing (simplified)
            // Expected format: data: {"choices": [{"delta": {"content": "..."}}]}
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        const content = data.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Not JSON, might be raw text or partial
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
export async function executeCommand(command: string, cwd?: string): Promise<{ output: string; exitCode: number }> {
    const response = await fetch(`${API_BASE}/api/terminal/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd }),
    });

    if (!response.ok) {
        throw new Error('Command execution failed');
    }

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
export async function createWorktree(projectId: string, featureName: string, sourcePath: string): Promise<{ treePath: string; branchName: string }> {
    const response = await fetch(`${API_BASE}/api/workflow/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, featureName, sourcePath }),
    });

    if (!response.ok) {
        throw new Error('Failed to create worktree');
    }

    return response.json();
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
