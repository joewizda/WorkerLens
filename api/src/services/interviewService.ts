import {
  Interview,
  CreateInterviewRequest,
  Chunk
} from "../types/interview";
import { convertToWav } from "../processors/convertToWav";
import { transcribe } from "../processors/transcriber";
import { parseSRT } from "../processors/chunkerTS";
import { embedChunks } from "../processors/embedder";
import { randomUUID } from "crypto";
import pool from "../database";

export const listInterviews = async (): Promise<Interview[]> => {
  const result = await pool.query(
    'SELECT * FROM wl_interviews ORDER BY created_at DESC'
  );
  return result.rows;
};

export const createInterview = async (
  metadata: CreateInterviewRequest, 
  file: Express.Multer.File
): Promise<{ interview: Interview; chunks: Chunk[] }> => {
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const interviewId = randomUUID();
    
    // Process audio first to get transcript
    const audioPath = await convertToWav(file.path);
    const srtContent = await transcribe(audioPath.outputPath!);
    const transcriptChunks = await parseSRT(srtContent, 180, 500);
    
    // Extract raw transcript text (remove timestamps)
    const rawTranscript = transcriptChunks
      .map(chunk => chunk.text)
      .join(' ')
      .trim();
    
    // Insert interview with all fields matching your database schema
    const insertInterviewQuery = `
      INSERT INTO wl_interviews (
        id, title, subject_name, address, city, state, zip_code,
        occupation, political_affiliation, interviewer, comments, 
        raw_transcript, date_conducted, subject_age, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const interviewResult = await client.query(insertInterviewQuery, [
      interviewId,                      // $1 - id
      file.originalname,                // $2 - title
      metadata.name,                    // $3 - subject_name
      metadata.address || null,         // $4 - address
      metadata.city || null,            // $5 - city
      metadata.state || null,           // $6 - state
      metadata.zip || null,             // $7 - zip_code
      metadata.occupation || null,      // $8 - occupation
      metadata.party || null,           // $9 - political_affiliation
      metadata.interviewer || null,     // $10 - interviewer
      metadata.comments || null,        // $11 - comments
      rawTranscript,                    // $12 - raw_transcript
      metadata.date || null,            // $13 - date_conducted
      metadata.age?.toString() || null, // $14 - subject_age
      new Date().toISOString()          // $15 - created_at
    ]);
    
    const newInterview: Interview = interviewResult.rows[0];
    
    // Embed chunks
    const embeddedChunks = await embedChunks(transcriptChunks);
    
    const chunks: Chunk[] = [];
    const insertChunkQuery = `
      INSERT INTO wl_interview_chunks (
        id, interview_id, sequence, content, vector, 
        start_time, end_time, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    for (let i = 0; i < embeddedChunks.length; i++) {
      const chunk = embeddedChunks[i];
      if (!chunk) continue;
      
      const chunkId = randomUUID();
      
      const chunkResult = await client.query(insertChunkQuery, [
        chunkId,
        interviewId,
        i + 1,
        chunk.text,
        JSON.stringify(chunk.embedding),
        chunk.start_time,
        chunk.end_time,
        new Date().toISOString()
      ]);
      
      chunks.push(chunkResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    console.log(`Saved interview ${interviewId} with ${chunks.length} chunks`);
    
    return { interview: newInterview, chunks };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating interview:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getInterview = async (id: string): Promise<Interview | null> => {
  const result = await pool.query(
    'SELECT * FROM wl_interviews WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const uploadChunks = async (id: string, chunks: any[]): Promise<{ success: boolean }> => {
  // Already handled in createInterview
  return { success: true };
};

export const searchInterview = async (id: string, query: string): Promise<any[]> => {
  // Embed the query
  const { llm } = await import('../llm/index.js');
  const queryEmbedding = await llm.embed(query);
  
  // Semantic search using cosine similarity
  const result = await pool.query(`
    SELECT 
      id, content, start_time, end_time,
      1 - (vector <=> $1::vector) as similarity
    FROM wl_interview_chunks
    WHERE interview_id = $2
    ORDER BY vector <=> $1::vector
    LIMIT 10
  `, [JSON.stringify(queryEmbedding), id]);
  
  return result.rows;
};

export const globalSearch = async (query: string): Promise<any[]> => {
  // Embed the query
  const { llm } = await import('../llm/index.js');
  const queryEmbedding = await llm.embed(query);
  
  // Global semantic search across all interviews
  const result = await pool.query(`
    SELECT 
      c.id, c.content, c.start_time, c.end_time,
      i.id as interview_id, i.title, i.subject_name,
      1 - (c.vector <=> $1::vector) as similarity
    FROM wl_interview_chunks c
    JOIN wl_interviews i ON c.interview_id = i.id
    ORDER BY c.vector <=> $1::vector
    LIMIT 20
  `, [JSON.stringify(queryEmbedding)]);
  
  return result.rows;
};