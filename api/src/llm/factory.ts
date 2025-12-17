import type { LLMProvider } from '../types/llm';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';

export type LLMProviderType = 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  model?: string;
  embeddingModel?: string;
}

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model, config.embeddingModel);
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}