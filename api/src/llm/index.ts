import { createLLMProvider } from './factory';
import { llmConfig } from '../config/llm';

export const llm = createLLMProvider(llmConfig);

export type { LLMMessage, LLMResponse, LLMOptions } from '../types/llm';