// lib/llm/schemas.ts
// Zod schemas for validating LLM outputs

import { z } from 'zod';

/**
 * Schema for query expansion output
 * Validates that the LLM returns an array of query strings
 */
export const QueryExpansionSchema = z.object({
  queries: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(20)
    .describe('Array of alternative YouTube search queries'),
});

/**
 * Schema for individual video relevance score
 */
export const RelevanceScoreSchema = z.object({
  id: z.string().min(1).describe('Video ID'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('Relevance score between 0 (not relevant) and 1 (highly relevant)'),
});

/**
 * Schema for batch relevance check output
 * Validates that the LLM returns an array of relevance scores
 */
export const BatchRelevanceSchema = z.object({
  scores: z
    .array(RelevanceScoreSchema)
    .describe('Array of video relevance scores'),
});

// Export inferred types
export type QueryExpansionOutput = z.infer<typeof QueryExpansionSchema>;
export type RelevanceScoreOutput = z.infer<typeof RelevanceScoreSchema>;
export type BatchRelevanceOutput = z.infer<typeof BatchRelevanceSchema>;

