
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
  raw_transcript?: string;
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
  // File path or identifier (comes from multer upload)
  file: string;
  
  // Format options for processing
  format: {
    save_summary?: 'docx' | 'pdf' | 'txt'; // Optional summary output format
    in: string; // Input format: 'mp3', 'acc', 'webm', 'wav', 'txt', etc.
  };
  
  // Interview metadata
  name: string;           // Subject's name
  address: string;        // Subject's address
  occupation: string;     // Subject's occupation
  party: string;          // Political affiliation
  interviewer: string;    // Interviewer's name
  comments?: string;      // Optional comments
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
  start_time: number;  // in seconds
  end_time: number;    // in seconds
  text: string;
}