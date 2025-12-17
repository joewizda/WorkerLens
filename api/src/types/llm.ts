export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  embed(text: string): Promise<number[]>;
}

export interface LLMOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
}