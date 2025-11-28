import { VoyageAIClient } from "voyageai";

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY!,
});

/* ---------------------------------------------
 * Embeddings using VoyageAI (free tier)
 * --------------------------------------------*/
export const embed = async (text: string) => {
  try {
    const embedding = await voyage.embed({
      input: text,
      model: "voyage-3-lite",
    });

    return embedding.data?.[0].embedding || [];
  } catch (e) {
    console.error("Error embedding text:", e);
    return [];
  }
};

/* ---------------------------------------------
 * Cosine Similarity
 * --------------------------------------------*/
export const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  let dot = 0,
    magA = 0,
    magB = 0;

  if (vecA.length !== vecB.length) return 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (!magA || !magB) return 0;
  return dot / (magA * magB);
};
