// lib/llm/langchain.ts
// LangChain implementation of LLM operations

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { ChatHuggingFaceAdapter } from './hf-adapter';
import { LLM_CONFIG } from './config';

// ============================================================
// Model Factory
// ============================================================

/**
 * Creates a HuggingFace chat model with the specified configuration
 */
function createModel(temperature: number, maxTokens: number) {
  if (!LLM_CONFIG.apiKey) {
    throw new Error('HF_TOKEN environment variable is not set');
  }

  return new ChatHuggingFaceAdapter({
    model: LLM_CONFIG.model,
    apiKey: LLM_CONFIG.apiKey,
    temperature,
    maxTokens,
  });
}

// ============================================================
// Prompt Templates - Optimized for JSON output
// ============================================================

/**
 * Prompt template for query expansion - optimized for strict JSON output
 */
const queryExpansionPrompt = ChatPromptTemplate.fromTemplate(
  `You are a JSON API that generates YouTube search queries. You ONLY respond with valid JSON, no explanations or markdown.

Task: Generate 10 alternative YouTube search queries for travel shorts about "{query}".

Requirements:
- ALL queries MUST include the location "{query}" or be directly about {query}
- Queries must be useful for YouTube search
- Keep queries short: 3-6 words each
- Focus on travel content specific to {query}: itineraries, places, food, guides, vlogs
- Example good queries: "{query} travel guide", "best places {query}", "{query} food tour", "things to do {query}"
- DO NOT generate generic queries without the location

Respond with ONLY this exact JSON structure, nothing else:
{{"queries": ["query1", "query2", "query3", "query4", "query5", "query6", "query7", "query8", "query9", "query10"]}}`,
);

/**
 * Prompt template for batch relevance checking - optimized for strict JSON output
 */
const batchRelevancePrompt = ChatPromptTemplate.fromTemplate(
  `You are a JSON API that scores video relevance. You ONLY respond with valid JSON, no explanations or markdown.

Task: Score each video's travel relevance to the query "{query}".

Scoring Examples:
- "3 Days in Paris Itinerary | Best Places" → 1.0 (itinerary for Paris, helpful for planning)
- "What I Ate in Tokyo | Street Food Tour" → 1.0 (food travel guide for Tokyo)
- "Best Hotels in Bali | Where to Stay" → 0.9 (accommodation guide for Bali)
- "Paris Cafe Aesthetic | Vlog Vibes" → 0.5 (lifestyle content about Paris, partial travel)
- "I Got LOST in Paris | Storytime" → 0.3 (entertainment about Paris, not useful)
- "Indian Street Food in Delhi #shorts" when query is "Paris" → 0.0 (WRONG LOCATION - not about Paris at all)
- "Tokyo Ramen Tour" when query is "Paris" → 0.0 (WRONG LOCATION - about Tokyo, not Paris)
- "Paris Meme Compilation" → 0.0 (not travel content)

CRITICAL RULE - Geographic Relevance:
- If the video is clearly about a DIFFERENT location than "{query}", score it 0.0
- The video MUST be about "{query}" or directly related to traveling to/in "{query}"
- Check video title, description, and transcript for location mentions
- A video about "Indian food" is NOT relevant for "Paris" unless it's "Indian food IN Paris"

Scoring:
- 1.0 = highly relevant to {query} (itinerary, places, food guide, travel tips for {query})
- 0.5 = partially relevant to {query} (vibes, lifestyle, tangential travel content about {query})
- 0.0 = not relevant (pranks, memes, pure entertainment, OR WRONG GEOGRAPHIC LOCATION)

Videos:
{videos}

Respond with ONLY this exact JSON structure, nothing else:
{{"scores": [{{"id": "VIDEO_ID", "score": SCORE}}, ...]}}`,
);

// ============================================================
// Helper: JSON Parsing (No Regex)
// ============================================================

/**
 * Extracts text content from LLM response (handles AIMessage, string, etc.)
 */
function extractTextContent(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  // Handle AIMessage or similar objects with content property
  if (input && typeof input === 'object' && 'content' in input) {
    const content = (input as { content: unknown }).content;
    if (typeof content === 'string') {
      return content;
    }
  }
  // Handle objects with text property
  if (input && typeof input === 'object' && 'text' in input) {
    const text = (input as { text: unknown }).text;
    if (typeof text === 'string') {
      return text;
    }
  }
  return String(input);
}

/**
 * Finds balanced JSON in a string using character-by-character parsing (no regex)
 * Returns the extracted JSON string or null if not found
 */
function findBalancedJson(text: string, startChar: '{' | '['): string | null {
  const closeChar = startChar === '{' ? '}' : ']';
  const startIndex = text.indexOf(startChar);

  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === startChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Safely parses JSON from LLM response text (no regex)
 * Handles direct JSON, JSON embedded in text, and markdown code blocks
 */
function safeJsonParse<T>(text: string): T | null {
  const trimmed = text.trim();

  // Try direct parse first (best case: LLM returned pure JSON)
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue to fallback strategies
  }

  // Remove markdown code blocks if present (simple string operations, no regex)
  let cleaned = trimmed;
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try parsing cleaned text
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to extraction
  }

  // Try to find balanced JSON object
  const jsonObj = findBalancedJson(cleaned, '{');
  if (jsonObj) {
    try {
      return JSON.parse(jsonObj) as T;
    } catch {
      // Continue
    }
  }

  // Try to find balanced JSON array
  const jsonArr = findBalancedJson(cleaned, '[');
  if (jsonArr) {
    try {
      return JSON.parse(jsonArr) as T;
    } catch {
      // Continue
    }
  }

  return null;
}

// ============================================================
// Helper: Retry with exponential backoff
// ============================================================

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number): number {
  const delay = LLM_CONFIG.retry.baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, LLM_CONFIG.retry.maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry logic
 */
async function withRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= LLM_CONFIG.retry.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < LLM_CONFIG.retry.maxAttempts) {
        const delay = calculateDelay(attempt);
        console.warn(
          `[LangChain] ${operation} attempt ${attempt} failed, retrying in ${delay}ms:`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delay);
      }
    }
  }

  console.error(
    `[LangChain] ${operation} failed after ${LLM_CONFIG.retry.maxAttempts} attempts:`,
    lastError,
  );
  throw lastError;
}

// ============================================================
// 1. Query Expansion
// ============================================================

/**
 * Expands a search query into multiple alternative queries using LLM
 *
 * @param query - The original search query
 * @returns Array of expanded queries, or the original query if expansion fails
 */
export async function expandQuery(query: string): Promise<string[]> {
  // Early return for empty queries
  if (!query?.trim()) {
    return [query];
  }

  try {
    return await withRetry(async () => {
      const model = createModel(
        LLM_CONFIG.queryExpansion.temperature,
        LLM_CONFIG.queryExpansion.maxTokens,
      );

      // Build the chain
      const chain = RunnableSequence.from([
        queryExpansionPrompt,
        model,
        // Parse LLM response and extract queries
        RunnableLambda.from(async (input: unknown) => {
          // Extract text content from AIMessage or other formats
          const text = extractTextContent(input);

          // Parse JSON from text (no regex)
          const parsed = safeJsonParse<{ queries?: string[] } | string[]>(text);

          if (parsed === null) {
            console.warn('[LangChain] Failed to parse JSON for query expansion, using fallback');
            return [query];
          }

          // Handle different response formats
          if (Array.isArray(parsed)) {
            // LLM returned just an array: ["query1", "query2"]
            const queries = parsed.filter((q): q is string => typeof q === 'string');
            return queries.length > 0 ? queries.slice(0, 10) : [query];
          }

          if (parsed && typeof parsed === 'object' && 'queries' in parsed) {
            // LLM returned object format: {"queries": [...]}
            const queries = parsed.queries;
            if (Array.isArray(queries)) {
              const validQueries = queries.filter((q): q is string => typeof q === 'string');
              return validQueries.length > 0 ? validQueries.slice(0, 10) : [query];
            }
          }

          // Fallback
          console.warn('[LangChain] Unexpected JSON structure for query expansion:', parsed);
          return [query];
        }),
      ]).withConfig({
        timeout: LLM_CONFIG.queryExpansion.timeout,
      });

      // Invoke the chain
      const result = await chain.invoke({ query: query.trim() });

      // Ensure we return an array of strings
      if (Array.isArray(result) && result.length > 0) {
        return result;
      }

      // Fallback to original query if result is invalid
      return [query];
    }, 'expandQuery');
  } catch (error) {
    console.error('[LangChain] expandQuery error:', error);
    // Fallback to original query (matching original behavior)
    return [query];
  }
}

// ============================================================
// 2. Batch Relevance Check
// ============================================================

/**
 * Checks relevance of multiple videos to a query using LLM
 *
 * @param query - The search query
 * @param videos - Array of videos with id and text content
 * @returns Array of relevance scores, or empty array if check fails
 */
export async function batchRelevanceCheck(
  query: string,
  videos: { id: string; text: string }[],
): Promise<{ id: string; score: number }[]> {
  // Early return for empty videos (matching original behavior)
  if (!videos.length) {
    return [];
  }

  try {
    return await withRetry(async () => {
      const model = createModel(
        LLM_CONFIG.batchRelevance.temperature,
        LLM_CONFIG.batchRelevance.maxTokens,
      );

      // Format videos for prompt
      const videosText = videos.map((v) => `ID: ${v.id}\nContent: ${v.text}`).join('\n---\n');

      // Build the chain
      const chain = RunnableSequence.from([
        batchRelevancePrompt,
        model,
        // Parse LLM response and extract scores
        RunnableLambda.from(async (input: unknown) => {
          // Extract text content from AIMessage or other formats
          const text = extractTextContent(input);

          // Parse JSON from text (no regex)
          type ScoreItem = { id: string; score: number };
          const parsed = safeJsonParse<{ scores?: ScoreItem[] } | ScoreItem[]>(text);

          // Build result with fallback scores for missing videos
          const buildResult = (scores: ScoreItem[]) => {
            const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
            return videos.map((video) => ({
              id: video.id,
              score: scoreMap.get(video.id) ?? 0.5,
            }));
          };

          if (parsed === null) {
            console.warn('[LangChain] Failed to parse JSON for relevance check, using defaults');
            return videos.map((v) => ({ id: v.id, score: 0.5 }));
          }

          // Handle different response formats
          if (Array.isArray(parsed)) {
            // LLM returned just an array: [{"id": "...", "score": 1}, ...]
            const validScores = parsed.filter(
              (s): s is ScoreItem => s && typeof s === 'object' && 'id' in s && 'score' in s,
            );
            return buildResult(validScores);
          }

          if (parsed && typeof parsed === 'object' && 'scores' in parsed) {
            // LLM returned object format: {"scores": [...]}
            const rawScores = parsed.scores;
            if (Array.isArray(rawScores)) {
              const validScores = rawScores.filter(
                (s): s is ScoreItem => s && typeof s === 'object' && 'id' in s && 'score' in s,
              );
              return buildResult(validScores);
            }
          }

          // Fallback
          console.warn('[LangChain] Unexpected JSON structure for relevance check:', parsed);
          return videos.map((v) => ({ id: v.id, score: 0.5 }));
        }),
      ]).withConfig({
        timeout: LLM_CONFIG.batchRelevance.timeout,
      });

      // Invoke the chain
      const result = await chain.invoke({
        query: query.trim(),
        videos: videosText,
      });

      return result;
    }, 'batchRelevanceCheck');
  } catch (error) {
    console.error('[LangChain] batchRelevanceCheck error:', error);
    // Fallback to empty array (matching original behavior)
    return [];
  }
}
