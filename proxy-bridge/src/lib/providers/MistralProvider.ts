import { OpenAIProvider } from './OpenAIProvider';

export class MistralProvider extends OpenAIProvider {
  constructor(apiKey: string, baseUrl: string = 'https://api.mistral.ai/v1') {
    super('mistral', apiKey, baseUrl);
  }
}
