import { llm } from '../llm';
import type { TranscriptChunk } from '../types/interview';

export interface EmbeddedChunk extends TranscriptChunk {
  embedding: number[];
}

export async function embedChunks(chunks: TranscriptChunk[]): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = [];
  
  for (const chunk of chunks) {
    // Embed the raw text
    const embedding = await llm.embed(chunk.text);
    
    embedded.push({
      ...chunk,
      embedding
    });
  }
  
  return embedded;
}