import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from '../types/llm';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;
  private embeddingModel: string;

  constructor(apiKey: string, defaultModel = 'gpt-4o-mini', embeddingModel = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = defaultModel;
    this.embeddingModel = embeddingModel;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? null,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      ...(response.usage ? {
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      } : {}),
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    return response.data[0]?.embedding || [];
  }
}