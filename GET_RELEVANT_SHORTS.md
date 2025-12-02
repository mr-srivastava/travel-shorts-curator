# How We Get Relevant Travel Shorts

Travel Curator fetches YouTube Shorts that are truly relevant to the user's travel query using a LangChain-powered LLM pipeline with HuggingFace inference.

## Pipeline Overview

### 1. Query Expansion (LangChain Chain)

The system first expands the user's query into multiple search variations using a LangChain `RunnableSequence`:

- **Model**: `Qwen/Qwen2.5-7B-Instruct` via custom `ChatHuggingFaceAdapter`
- **Temperature**: 0.2 (focused, deterministic)
- **Prompt**: Generates 10 alternative YouTube search queries focused on travel content (itineraries, places, food, guides, vlogs)
- **Query Requirements**: All queries MUST include the location/query or be directly about it (prevents generic queries)
- **Output**: JSON array of queries, parsed with balanced-bracket JSON extraction (no regex)
- **Retry Logic**: Exponential backoff (3 attempts, 2s→4s→8s delays, max 10s)
- **Fallback**: Returns original query if expansion fails

### 2. YouTube Data API Search

For each expanded query (top 5 used):
- Search with `videoDuration=short` and `#shorts` suffix
- Retrieve 5 results per query (max 25 total)
- Fetch metadata: title, description, thumbnails, channel info
- Deduplicate results by `videoId`

### 3. Fetch Video Details

- **Statistics**: View counts, duration via YouTube Videos API
- **Channel Avatars**: Fetched in batches of 50 channels
- **Transcripts**: Auto-generated captions via parallel fetching (5 concurrent max using `p-limit`)
  - Up to 1000 chars per transcript
  - Fallback to empty string if unavailable

### 4. Batch Relevance Scoring (LangChain Chain)

All videos are scored in a single LLM call using another `RunnableSequence`:

- **Model**: `Qwen/Qwen2.5-7B-Instruct`
- **Temperature**: 0 (fully deterministic scoring)
- **Input**: Query + formatted video content (ID, title, description, transcript)
- **Geographic Validation**: Videos about WRONG locations get 0.0 score (e.g., "Tokyo food tour" when query is "Paris")
- **Scoring Criteria**:
  - `1.0` = Highly relevant (itinerary, places, food guide, travel tips for the queried location)
  - `0.5` = Partially relevant (vibes, lifestyle, tangential travel content about the location)
  - `0.0` = Not relevant (pranks, memes, pure entertainment, OR wrong geographic location)
- **Output**: JSON with `{id, score}` pairs for each video
- **Fallback**: Default score of 0.5 for parse failures or missing videos

### 5. Final Scoring Formula

```
score = (0.7 × LLM_score + 0.15 × keyword_match + 0.15 × engagement) × spam_penalty
```

**Components:**

- **LLM Score** (0–1): From batch relevance check
- **Keyword Match** (0 or 1): Binary boost for travel keywords (flight, hotel, tour, guide, landmark, etc.)
- **Engagement** (0–1): Enhanced metric combining:
  - Base engagement: `min(log₁₀(views + 1) / 7, 1)` × 0.6
  - Velocity: `min(log₁₀(views_per_day + 1) / 5, 1)` × 0.2
  - Recency boost: `min(exp(-days_since_upload / 60), 1)` × 0.2
- **Spam Penalty** (0.3 or 1.0): 70% reduction for videos with spam indicators
  - Spam indicators: prank, challenge, reaction, storytime, grwm, ootd, unboxing, haul, tiktok, meme, compilation, funny, exposed, drama, tea, gossip

### 6. Ranking & Selection

- Sort by final score descending
- Return top 12 videos
- Results cached in development via React `cache()`
- Relevance reason displayed: `LLM=X.XX, kw=X, eng=X.XX (XXXd old) [spam]`

## Architecture

```
lib/llm/
├── langchain.ts    # LangChain chains (expandQuery, batchRelevanceCheck)
├── hf-adapter.ts   # ChatHuggingFaceAdapter for @langchain/core
├── config.ts       # Model config, timeouts, retry settings
├── types.ts        # TypeScript types
└── index.ts        # Public exports

app/
└── actions.ts      # Server actions (searchTravelShorts)
```

## LangChain Implementation Details

### Custom HuggingFace Adapter

`ChatHuggingFaceAdapter` extends `BaseChatModel` from `@langchain/core`:
- Wraps `@huggingface/inference` InferenceClient
- Converts LangChain messages to HF chat completion format
- Returns `AIMessage` responses compatible with chains

### Prompt Engineering

Both prompts use strict JSON-only instructions:
- "You ONLY respond with valid JSON, no explanations or markdown"
- Provides exact expected structure: `{"queries": [...]}` or `{"scores": [...]}`
- Includes examples in prompts to guide output format

### JSON Parsing Strategy

Multi-stage fallback parsing without regex:
1. Try direct `JSON.parse()` on trimmed response
2. Strip markdown code blocks (` ```json ` and ` ``` `)
3. Extract balanced JSON object/array using character-by-character parsing
   - Tracks `{` / `}` or `[` / `]` depth
   - Handles string escaping and quotes properly
4. Return `null` if all strategies fail (triggers fallback scores)

### Retry Configuration

- **Max Attempts**: 3
- **Base Delay**: 2000ms
- **Exponential Backoff**: `delay = min(baseDelay × 2^(attempt-1), maxDelay)`
- **Max Delay**: 10000ms
- **Applied to**: Query expansion and batch relevance check

### Timeouts

- **Query Expansion**: 30 seconds
- **Batch Relevance**: 60 seconds (longer for batch operations)

## Performance Optimizations

1. **Parallel Transcript Fetching**: 5 concurrent requests using `p-limit`
2. **Batch Scoring**: All videos scored in single LLM call (vs. per-video calls)
3. **Channel Avatar Batching**: Up to 50 channel IDs per API request
4. **Query Limit**: Only top 5 expanded queries used (out of 10 generated)
5. **Transcript Truncation**: First 1000 chars only (reduces LLM context size)

## Error Handling

- **Missing API Keys**: Falls back to mock search results
- **LLM Failures**: Returns original query (expansion) or empty array (scoring)
- **Network Errors**: Retries with exponential backoff
- **Parse Failures**: Uses fallback scores (0.5 for relevance)
