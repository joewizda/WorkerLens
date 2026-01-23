export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Request body for creating a new interview
 */
export interface CreateMediaRequest {
  title?: string; 
  description?: string;
  metadata?: JsonObject;
  type: 'text' | 'video' | 'meme' | 'image' | 'youtube';
  tags?: string[];
  captions?: string;
  location?: string; // URL or file path
}

export type WhisperSegment = { start: number; end: number; text: string };