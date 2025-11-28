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
      ],
      temperature: 0.2,
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

/* -------------------------------------------------------
 * 2. Batch Relevance Check — one LLM call for all videos
 * -------------------------------------------------------*/
export const batchRelevanceCheck = async (
  query: string,
  videos: { id: string; text: string }[]
) => {
  if (videos.length === 0) return [];

  try {
    const prompt = `
Evaluate travel relevance for each video to the following query:

Query: "${query}"

Rate each:
- 1   = very helpful travel content
- 0.5 = somewhat relevant
- 0   = not relevant

Return ONLY a JSON array like:
[
  { "id": "VIDEO_ID", "score": 1 },
  { "id": "VIDEO_ID", "score": 0.5 }
]

Videos:
${videos
        .map(
          v => `
ID: ${v.id}
${v.text}
`
        )
        .join("\n\n")}
    `.trim();

    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = res.choices[0].message.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);

    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error("Error in batch relevance check:", e);
    return [];
  }
};