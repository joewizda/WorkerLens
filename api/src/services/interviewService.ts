import { Interview, CreateInterviewRequest } from "../types/interview";
import { convertToWav } from "../processors/convertToWav";
import { transcribe } from "../processors/transcriber";
import { parseSRT } from "../processors/chunkerTS";
import { randomUUID } from "crypto";

// Placeholder in-memory store
const interviews: Interview[] = [];

export const listInterviews = async (): Promise<Interview[]> => {
  return interviews;
};

export const createInterview = async (
  metadata: CreateInterviewRequest, file: Express.Multer.File
): Promise<Interview> => {
  // Normalize the interview metadata.
  const newInterview: Interview = {
    id: randomUUID(),
    title: file.fieldname,
    subject_name: metadata.name,
    address: metadata.address,
    occupation: metadata.occupation,
    political_affiliation: metadata.party,
    interviewer: metadata.interviewer,
    comments: metadata.comments || '',
    creeated_at: new Date().toISOString(),
  };
  const audioPath = await convertToWav(file.path);
  const transcript: string = await transcribe(audioPath.outputPath!);
  //LLM text processing for interviewer/subject separation
  const chunks = await parseSRT(transcript, 180, 500);
  console.log(`Chunks: ${JSON.stringify(chunks, null, 2)}`);

  return newInterview;
};

export const getInterview = async (id: string): Promise<Interview | null> => {
  return interviews.find(i => i.id === id) || null;
};

export const uploadChunks = async (id: string, chunks: any[]): Promise<{ success: boolean }> => {
  // Placeholder: save chunks to DB
  return { success: true };
};

export const searchInterview = async (id: string, query: string): Promise<any[]> => {
  // Placeholder for semantic + text search
  return [];
};

export const globalSearch = async (query: string): Promise<any[]> => {
  return [];
};