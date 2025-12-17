import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from '../types/llm';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    // Separate system message from conversation
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.max_tokens || 4096,
      temperature: options?.temperature ?? 0.7,
      ...(systemMessage && { system: systemMessage }),
      messages: conversationMessages,
    });

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async embed(text: string): Promise<number[]> {
    throw new Error('Claude does not provide embeddings. Use OpenAI or Voyage AI for embeddings.');
  }
}