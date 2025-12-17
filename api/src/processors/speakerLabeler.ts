import { llm } from '../llm';
import type { TranscriptChunk, LabeledChunk } from '../types/interview';

/**
 * Heuristic-based speaker inference
 * Works for ~70-80% of chunks without needing LLM
 */
function inferSpeakerHeuristic(text: string): 'interviewer' | 'subject' | 'unknown' {
  const trimmed = text.trim();
  
  // Questions → likely interviewer
  if (trimmed.endsWith('?')) return 'interviewer';
  if (/^(what|how|why|where|when|who|do you|are you|can you|would you|did you)\b/i.test(trimmed)) {
    return 'interviewer';
  }
  
  // First-person statements → likely subject
  if (/\b(I am|I was|I think|I believe|I grew up|I work|I live|my name|my age)\b/i.test(trimmed)) {
    return 'subject';
  }
  
  return 'unknown';
}

/**
 * Label speakers using heuristics first, then LLM for unknowns
 */
export async function labelSpeakers(chunks: TranscriptChunk[]): Promise<LabeledChunk[]> {
  const labeled: LabeledChunk[] = [];
  const unknownIndices: number[] = [];
  
  // First pass: heuristic labeling
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const speaker = inferSpeakerHeuristic(chunk.text);
    
    labeled.push({
      ...chunk,
      speaker,
      labeled_text: speaker === 'unknown' ? chunk.text : `${speaker.toUpperCase()}: ${chunk.text}`
    });
    
    if (speaker === 'unknown') {
      unknownIndices.push(i);
    }
  }
  
  // Second pass: LLM for unknowns (in windows of 10)
  if (unknownIndices.length > 0) {
    await labelUnknownChunksWithLLM(labeled, unknownIndices);
  }
  
  return labeled;
}

/**
 * Use LLM to label unknown chunks in windows
 */
async function labelUnknownChunksWithLLM(
  chunks: LabeledChunk[], 
  unknownIndices: number[]
): Promise<void> {
  const WINDOW_SIZE = 10;
  
  for (let i = 0; i < unknownIndices.length; i += WINDOW_SIZE) {
    const windowIndices = unknownIndices.slice(i, i + WINDOW_SIZE);
    
    const contextChunks = windowIndices.map(idx => ({
      index: idx,
      text: chunks[idx]!.text,
      speaker: chunks[idx]!.speaker
    }));
    
    const response = await llm.chat([
      {
        role: 'system',
        content: 'Label each chunk as either "interviewer" or "subject". Return JSON array: [{"index": 0, "speaker": "interviewer"}, ...]'
      },
      {
        role: 'user',
        content: JSON.stringify(contextChunks)
      }
    ], { temperature: 0.3, max_tokens: 500 });
    
    const labels = JSON.parse(response.content);
    
    for (const label of labels) {
      chunks[label.index]!.speaker = label.speaker;
      chunks[label.index]!.labeled_text = `${label.speaker.toUpperCase()}: ${chunks[label.index]!.text}`;
    }
  }
}

/**
 * Merge small labeled chunks into larger ones while preserving speaker turns
 */
export function mergeLabeledChunks(
  chunks: LabeledChunk[],
  targetDuration: number,
  maxWords: number
): LabeledChunk[] {
  if (chunks.length === 0) return [];
  
  const merged: LabeledChunk[] = [];
  let current = { ...chunks[0]! };
  
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const duration = current.end_time - current.start_time;
    const wordCount = current.text.split(/\s+/).length;
    
    // Only merge if same speaker AND under limits
    const sameSpeaker = current.speaker === chunk.speaker;
    const underLimits = duration < targetDuration && wordCount < maxWords;
    
    if (sameSpeaker && underLimits) {
      current.end_time = chunk.end_time;
      current.text += ' ' + chunk.text;
      current.labeled_text += ' ' + chunk.text;
    } else {
      merged.push(current);
      current = { ...chunk };
    }
  }
  
  merged.push(current);
  return merged;
}