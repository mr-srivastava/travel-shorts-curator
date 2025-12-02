// lib/llm/types.ts
// TypeScript type definitions for LLM operations

import type {
  QueryExpansionOutput,
  RelevanceScoreOutput,
  BatchRelevanceOutput,
} from './schemas';

/**
 * Input type for query expansion
 */
export interface QueryExpansionInput {
  query: string;
}

/**
 * Input type for batch relevance check
 */
export interface BatchRelevanceInput {
  query: string;
  videos: Array<{
    id: string;
    text: string;
  }>;
}

/**
 * Re-export schema types for convenience
 */
export type {
  QueryExpansionOutput,
  RelevanceScoreOutput,
  BatchRelevanceOutput,
};

