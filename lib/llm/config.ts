// lib/llm/config.ts
// Configuration constants for LLM operations

export const LLM_CONFIG = {
  // Model configuration
  model: 'Qwen/Qwen2.5-7B-Instruct', // Using 7B for reliability on free tier
  // Alternative: 'Qwen/Qwen2.5-14B-Instruct' (better quality but may be slower/overloaded)
  apiKey: process.env.HF_TOKEN,

  // Query expansion settings
  queryExpansion: {
    temperature: 0.2,
    maxTokens: 300,
    timeout: 30000, // 30 seconds
  },

  // Batch relevance check settings
  batchRelevance: {
    temperature: 0, // Deterministic scoring
    maxTokens: 600,
    timeout: 60000, // 60 seconds (longer for batch operations)
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 2000, // 2 second
    maxDelay: 10000, // 10 seconds
  },
} as const;

// Validate required environment variables
export function validateConfig(): void {
  if (!LLM_CONFIG.apiKey) {
    console.warn('HF_TOKEN environment variable is not set. LLM operations may fail.');
  }
}

// Export type for configuration
export type LLMConfig = typeof LLM_CONFIG;
