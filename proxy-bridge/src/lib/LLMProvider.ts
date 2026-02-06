import { ILLMProvider, LLMMessage, LLMProviderOptions, LLMResponse } from './types/llm';

export abstract class LLMProvider implements ILLMProvider {
  abstract id: string;
  abstract chat(messages: LLMMessage[], options?: LLMProviderOptions): Promise<LLMResponse>;

  protected normalizeMessages(messages: LLMMessage[]): LLMMessage[] {
    // Default normalization logic if needed
    return messages;
  }
}
