// lib/huggingface.ts
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient(process.env.HF_TOKEN);

/* -----------------------------------------------------------
 * 1. Query Expansion (HuggingFace Chat)
 * -----------------------------------------------------------*/
export async function expandQuery(query: string): Promise<string[]> {
  try {
    const prompt = `
Generate 10 alternative YouTube search queries for travel shorts about: "${query}"
Rules:
- Only return queries useful for YouTube search
- Keep them short, 3–6 words max
- Strictly respond with a JSON array of strings

Example:
["goa travel places", "goa itinerary", ...]
`;

    const res = await hf.chatCompletion({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    });

    const raw = res.choices?.[0]?.message?.content ?? '[]';
    const match = raw.match(/\[[\s\S]*\]/);

    return match ? JSON.parse(match[0]) : [query];
  } catch (e) {
    console.error('expandQuery error:', e);
    return [query];
  }
}

/* -----------------------------------------------------------
 * 2. Batch Relevance Check (HuggingFace Chat)
 * -----------------------------------------------------------*/
export async function batchRelevanceCheck(
  query: string,
  videos: { id: string; text: string }[]
): Promise<{ id: string; score: number }[]> {
  if (!videos.length) return [];

  try {
    const prompt = `
Evaluate travel relevance for each video to this query:

Query: "${query}"

Rules:
- Score 1 = very helpful / itinerary / places / food / guide / vlog
- Score 0.5 = somewhat useful / vibes / partial relevance
- Score 0 = not relevant (pranks, memes, non-travel)

Return STRICT JSON ONLY:
[
  { "id": "...", "score": 1 },
  { "id": "...", "score": 0.5 }
]

Videos:
${videos
  .map(
    (v) => `
ID: ${v.id}
Content:
${v.text}
`
  )
  .join('\n')}
`;

    const res = await hf.chatCompletion({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0,
    });

    const raw = res.choices?.[0]?.message?.content ?? '[]';
    const match = raw.match(/\[[\s\S]*\]/);

    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('batchRelevanceCheck error:', e);
    return [];
  }
}
