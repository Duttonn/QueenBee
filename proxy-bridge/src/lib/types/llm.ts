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
  role: LLMRole;
  content: string | null;
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
}

export interface ILLMProvider {
  id: string;
  chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse>;
  chatStream?(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse>;
}
