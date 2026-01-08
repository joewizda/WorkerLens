import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions, LLMImageContent } from '../types/llm';

const apiKey =
  process.env.OPENAI_API_KEY ??
  process.env.LLM_API_KEY ??
  "";

if (!apiKey) {
  throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY or LLM_API_KEY.");
}

const defaultModel = process.env.SUMMARIZER_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
const embeddingModel = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";


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

  private async filePathToDataUrl(filePath: string): Promise<string> {
    const buf = await fs.readFile(filePath);
    const base64 = buf.toString('base64');
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'png'
      ? 'image/png'
      : (ext === 'jpg' || ext === 'jpeg')
      ? 'image/jpeg'
      : 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  }

  async describeImage(
    imageContent: LLMImageContent,
    prompt = 'Describe this image in 2-3 sentences. Focus on key visual elements and subjects.',
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const visionModel = options?.model || process.env.VISION_MODEL || 'gpt-4o-mini';
    const supportedVisionModels = new Set(['gpt-4o', 'gpt-4o-mini']);
    if (!supportedVisionModels.has(visionModel)) {
      throw new Error(`Model '${visionModel}' does not support images. Use one of: ${Array.from(supportedVisionModels).join(', ')} or set VISION_MODEL.`);
    }

    // Normalize to Chat Completions API content item
    const imageItem =
      imageContent.type === 'image_file'
        ? {
            type: 'image_url' as const,
            image_url: { url: await this.filePathToDataUrl(imageContent.image_file.path), detail: 'high' as const },
          }
        : {
            type: 'image_url' as const,
            image_url: { url: imageContent.image_url.url, detail: 'high' as const },
          };

    console.log('Describing image with model:', visionModel);

    const response = await this.client.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            imageItem,
          ],
        },
      ],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.max_tokens ?? 300,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      ...(response.usage
        ? {
            usage: {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            },
          }
        : {}),
    };
  }
}

export const llm = new OpenAIProvider(apiKey, defaultModel, embeddingModel);
// Convenience wrapper built on llm.chat
export async function summarizeText(
  content: string,
  opts?: { model?: string; temperature?: number; max_tokens?: number }
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: "system", content: "Summarize the text concisely in 1-2 sentences. Use plain language." },
    { role: "user", content },
  ];
  const resp = await llm.chat(messages, {
    ...(opts?.model && { model: opts.model }),
    temperature: opts?.temperature ?? 0.2,
    ...(opts?.max_tokens !== undefined && { max_tokens: opts.max_tokens }),
  });
  return resp.content.trim();
}

// Convenience wrapper for image description using the global llm instance
export async function describeImageContent(
  imageContent: LLMImageContent,
  prompt?: string,
  opts?: { model?: string; temperature?: number; max_tokens?: number }
): Promise<string> {
  const resp = await llm.describeImage(imageContent, prompt, opts);
  return resp.content.trim();
}