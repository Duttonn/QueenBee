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
    id?: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[];
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
    composerMode?: 'code' | 'chat' | 'plan';
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
            agentId: request.agentId,
            composerMode: request.composerMode
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
    onEvent?: (event: { type: string; data: any }) => void,
    onMessage?: (message: Message) => void,
    maxRetries = 1
): Promise<void> {
    let retries = 0;
    let fullText = '';

    const attempt = async (): Promise<void> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Codex-Provider': request.provider || 'mock',
        };

        if (request.apiKey) {
            headers['Authorization'] = `Bearer ${request.apiKey}`;
        }

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
                agentId: request.agentId,
                composerMode: request.composerMode
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Chat request failed' }));
            throw new Error(error.error || 'Chat request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('Response body is null');
        }

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const payload = line.substring(6).trim();
                        if (payload === '[DONE]') continue;

                        try {
                            const data = JSON.parse(payload);

                            if (data.error) {
                                throw new Error(data.error.message || 'Stream error');
                            }

                            // Handle Agent Events
                            if (data.type && data.type !== 'message' && onEvent) {
                                onEvent(data);
                            }

                            // Handle Full Message Updates
                            if (data.type === 'message' && data.data && onMessage) {
                                onMessage(data.data);
                                if (data.data.content) {
                                    fullText = data.data.content;
                                }
                                continue;
                            }

                            // Try OpenAI format first
                            let content = data.choices?.[0]?.delta?.content;

                            // Fallback to direct content
                            if (!content && data.content) {
                                content = data.content;
                            }

                            if (content) {
                                fullText += content;
                                onChunk(content);
                            }
                        } catch (e: any) {
                            if (e.message?.includes('Stream error')) throw e;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    };

    try {
        await attempt();
        onComplete(fullText);
    } catch (error: any) {
        if (retries < maxRetries) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`[API] Stream failed, retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`, error);
            await new Promise(r => setTimeout(r, delay));
            // When retrying, we might want to append a "reconnecting" message or similar
            return sendChatMessageStream(request, onChunk, onComplete, onError, onEvent, onMessage, maxRetries - retries);
        }
        onError(error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Get git diff for a project
 */
export async function getGitDiff(projectPath: string, filePath?: string, staged?: boolean): Promise<DiffStats> {
    const params = new URLSearchParams({ projectPath });
    if (filePath) params.append('filePath', filePath);
    if (staged) params.append('staged', 'true');

    const response = await fetch(`${API_BASE}/api/git/diff?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get diff');
    }

    return response.json();
}

/**
 * Get git branches for a project
 */
export async function getGitBranches(projectPath: string): Promise<{ current: string, all: string[], branches: any }> {
    const params = new URLSearchParams({ projectPath });
    const response = await fetch(`${API_BASE}/api/git/branches?${params}`);

    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get branches');
        } else {
            const text = await response.text();
            console.error('[API] Non-JSON error response:', text.substring(0, 200));
            throw new Error(`Server Error (${response.status}): See console for details`);
        }
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
 * Get flat list of files in a project for autocompletion
 */
export async function getProjectFiles(projectPath: string): Promise<string[]> {
    const params = new URLSearchParams({ path: projectPath });
    const response = await fetch(`${API_BASE}/api/projects/files?${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.files || [];
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

/**
 * Transcribe audio blob using Whisper via backend
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: audioBlob,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
    }

    const data = await response.json();
    return data.text;
}
