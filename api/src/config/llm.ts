import 'dotenv/config';
import type { LLMConfig } from '../llm/factory';

export const llmConfig: LLMConfig = {
  provider: (process.env.LLM_PROVIDER as 'openai' | 'claude') || 'openai',
  apiKey: process.env.LLM_API_KEY || '',
  ...(process.env.LLM_MODEL && { model: process.env.LLM_MODEL }),
  ...(process.env.EMBEDDING_MODEL && { embeddingModel: process.env.EMBEDDING_MODEL }),
};