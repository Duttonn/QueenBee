import { ILLMProvider, LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';

export abstract class LLMProvider implements ILLMProvider {
  abstract id: string;
  abstract chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse>;
  chatStream?(messages: LLMMessage[], options?: LLMProviderOptions): AsyncGenerator<LLMResponse>;

  hasKey(): boolean {
    return true; // Default to true, override in subclasses
  }

  protected normalizeMessages(messages: LLMMessage[]): LLMMessage[] {
    // Default normalization logic if needed
    return messages;
  }
}
