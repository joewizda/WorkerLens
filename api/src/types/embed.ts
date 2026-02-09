export interface EmbeddingSearchResult {
  id: string;
  interview_id: string;
  sequence: number;
  content: string;
  distance: number;
  relevance: number;
  start_time?: number;
  end_time?: number;
}

export interface CreateVectorsRequest {
  query: string;
}

export interface SearchEmbeddingsRequest {
  query: string;
  limit?: number;
}
