// lib/groq.ts
import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/* ---------------------------------------------
 * 1. Query Expansion using Groq
 * --------------------------------------------*/
export const expandQuery = async (q: string) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Generate 10 alternative YouTube search queries for travel shorts about: "${q}". 
Return only a JSON array of strings.`
        }
      ]
    });

    const content = completion.choices[0].message.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [q];
  } catch (e) {
    console.error("Error expanding query:", e);
    return [q];
  }
};

/* ---------------------------------------------
 * 2. Relevance Check using Groq
 * --------------------------------------------*/
export const relevanceCheck = async (text: string, query: string) => {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a travel content evaluator.
A video may be narrated, music-only, or montage.
Rate usefulness:
1 = very helpful travel content
0.5 = somewhat relevant
0 = not relevant
Only penalize videos with NO travel content.`
        },
        {
          role: "user",
          content: `Query: ${query}
Video Metadata:
${text}`
        }
      ]
    });

    const content = res.choices[0].message.content?.trim();
    const match = content?.match(/0\.5|0|1/);
    return match ? Number(match[0]) : 0;
  } catch (e) {
    console.error("Error checking relevance:", e);
    return 0.5;
  }
};
