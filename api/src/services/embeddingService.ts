import pool from "../database";
import { OpenAIProvider } from "../llm/openai";
import { EmbeddingSearchResult } from "../types/embed";

export const searchSimilarEmbeddings = async (
  searchString: string,
  limit: number = 10
): Promise<EmbeddingSearchResult[]> => {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY environment variable is not set");
  }
  
  const openai = new OpenAIProvider(apiKey);
  const embedding = await openai.embed(searchString);
  const embeddingString = `[${embedding.join(",")}]`;

  const result = await pool.query(
    `SELECT 
      id,
      interview_id,
      sequence,
      content,
      start_time,
      end_time,
      vector <-> $1::vector AS distance,
      1 - (vector <-> $1::vector) AS relevance
    FROM wl_interview_chunks
    ORDER BY vector <-> $1::vector
    LIMIT $2`,
    [embeddingString, limit]
  );

  return result.rows;
};