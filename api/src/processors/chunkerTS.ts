import type { TranscriptChunk } from '../types/interview';

/**
 * Convert SRT (subrip subtitle) timestamp (HH:MM:SS,mmm) to seconds
 */
function srtTimestampToSeconds(
  hours: string, minutes: string, seconds: string, milliseconds: string
): number {
  return parseInt(hours) * 3600 + 
         parseInt(minutes) * 60 + 
         parseInt(seconds) + 
         parseInt(milliseconds) / 1000;
}

/**
 * Parse SRT format and merge into larger chunks suitable for LLM processing
 * @param srt - SRT formatted string from Whisper
 * @param targetDuration - Target duration in seconds for each chunk (default: 60)
 * @param maxWords - Maximum words per chunk (default: 300)
 */
export async function parseSRT(
  srt: string, 
  targetDuration: number = 60,
  maxWords: number = 300
): Promise<TranscriptChunk[]> {

  console.log('Parsing SRT content...');

  const rawChunks: TranscriptChunk[] = [];
  const blocks = srt.trim().split('\n\n');
  
  // First, parse all raw SRT blocks
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    const timeMatch = lines[1]?.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );
    if (!timeMatch) continue;
    
    const start_time = srtTimestampToSeconds(
      timeMatch[1]!,
      timeMatch[2]!,
      timeMatch[3]!,
      timeMatch[4]!
    );
    const end_time = srtTimestampToSeconds(
      timeMatch[5]!,
      timeMatch[6]!,
      timeMatch[7]!,
      timeMatch[8]!
    );
    const text = lines.slice(2).join(' ');
    
    rawChunks.push({ start_time, end_time, text });
  }
  return mergeChunks(rawChunks, targetDuration, maxWords);
}

/**
 * Merge small chunks into larger ones based on duration and word count
 */
function mergeChunks(
  chunks: TranscriptChunk[], 
  targetDuration: number,
  maxWords: number
): TranscriptChunk[] {
  if (chunks.length === 0) return [];
  
  const merged: TranscriptChunk[] = [];
  let current: TranscriptChunk = { ...chunks[0]! };
  
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const duration = current.end_time - current.start_time;
    const wordCount = current.text.split(/\s+/).length;
    
    // Merge if under target duration AND under max words
    if (duration < targetDuration && wordCount < maxWords) {
      current.end_time = chunk.end_time;
      current.text += ' ' + chunk.text;
    } else {
      merged.push(current);
      current = { ...chunk };
    }
  }
  
  // Push the last chunk
  merged.push(current);
  
  return merged;
}