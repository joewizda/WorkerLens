/**
 * Database schema types (wl_interviews)
 */
export interface Interview {
  id: string;
  title: string;
  subject_name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  date_conducted?: string;
  age?: number
  occupation?: string;
  political_affiliation?: string;
  interviewer?: string;
  comments?: string;
  creeated_at: string;
};

/**
 * Database schema types (wl_interview_chunks)
 */
export interface InterviewChunk {
  id: string;
  interview_id: string;
  sequence: number;
  content: string;
  vector?: number[];
  speaker?: string;
  start_time?: number;
  end_time?: number;
  created_at: string;
}

/**
 * Request body for creating a new interview
 */
export interface CreateInterviewRequest {
  // Interview metadata
  title?: string; // File name
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  occupation?: string;
  party?: string;
  interviewer?: string;
  comments?: string;
  date_conducted?: string;
  raw_transcript?: string;
  date?: string;
  age?: number;
}

/**
 * Response after creating an interview
 */
export interface CreateInterviewResponse {
  id: string;
  message: string;
  chunks_created: number;
  summary_path?: string;
}

export interface TranscriptChunk {
  start_time: number;
  end_time: number;
  text: string;
}

export interface LabeledChunk extends TranscriptChunk {
  speaker: 'interviewer' | 'subject' | 'unknown';
  labeled_text: string;  // "INTERVIEWER: what is your name"
}

export interface Chunk {
  id: string;
  interview_id: string;
  start_time: number;
  end_time: number;
  text: string;
  summary?: string;      // Optional: LLM-generated summary
  embedding: number[];   // Vector embedding for semantic search
  created_at: string;
}

export interface CreateChunkData {
  interview_id: string;
  start_time: number;
  end_time: number;
  text: string;
  summary?: string;
  embedding: number[];
}