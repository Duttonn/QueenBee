export type LLMRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMMessage {
  id?: string;
  role: LLMRole;
  content: string | any[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string | null;
  tool_calls?: LLMToolCall[];
  usage?: LLMUsage;
  finish_reason?: string;
}

export interface LLMProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string[];
  response_format?: { type: 'json_object' | 'text' };
  apiKey?: string;
  tools?: any[];
  composerMode?: 'code' | 'chat' | 'plan';
  sessionId?: string;
  /** P18-03: Frozen snapshot of the system prompt captured at session init.
   *  When set, AnthropicProvider will send it as a cached prefix block
   *  (cache_control: ephemeral) for ~90% token savings on repeated calls. */
  systemSnapshot?: string;
}

export interface ILLMProvider {
  id: string;
  chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse>;
  chatStream?(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse>;
}
