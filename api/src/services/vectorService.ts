import { OpenAIProvider } from "../llm/openai";

export const createEmbeddedVectors = async (
  searchString: string,
): Promise<string> => {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY environment variable is not set");
  }

  const openai = new OpenAIProvider(apiKey);
  const embedding = await openai.embed(searchString);
  const embeddingString = `[${embedding.join(",")}]`;
  return embeddingString;
};
