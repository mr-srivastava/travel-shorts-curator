# Travel Curator

Travel Curator is a modern web application built with **Next.js** and **shadcn/ui** that helps users discover relevant travel-related YouTube Shorts. Users can search for a city or country, and the app fetches curated short videos using the YouTube Data API, ensuring the content is truly travel-focused through LLM-powered relevance scoring.

## Features

- Clean, premium dashboard UI with dark-mode support
- Search bar to query destinations
- LangChain-powered query expansion and relevance filtering
- Automatic relevance scoring based on video metadata, transcripts, and LLM analysis
- Responsive grid of short video cards with embedded player modal
- Fast development experience with hot-module replacement

## How It Works

### LangChain Pipeline

The app uses LangChain TS with a HuggingFace adapter for intelligent video curation:

1. **Query Expansion** – User queries are expanded into 10 alternative search terms using a LangChain `RunnableSequence` chain
2. **YouTube Search** – Each expanded query searches YouTube for shorts
3. **Batch Relevance Scoring** – All videos are scored in a single LLM call with structured JSON output
4. **Final Ranking** – Combines LLM score (70%), keyword matching (15%), and engagement factor (15%)

### Scoring Criteria

- `1.0` = Highly relevant (itineraries, places, food, guides, vlogs)
- `0.5` = Partially relevant (vibes, lifestyle, partial travel content)
- `0.0` = Not relevant (pranks, memes, unrelated)

See [GET_RELEVANT_SHORTS.md](./GET_RELEVANT_SHORTS.md) for detailed pipeline documentation.

## Getting Started

```bash
# Install dependencies
yarn install   # or yarn / pnpm

# Create a .env.local file with required keys
cat <<EOF > .env.local
YOUTUBE_API_KEY=your_youtube_api_key
HF_TOKEN=your_huggingface_api_token
EOF

# Run the development server
yarn dev
```

Open <http://localhost:3000> in your browser.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API key |
| `HF_TOKEN` | HuggingFace API token for LLM inference |

## Tech Stack

- **Next.js** – React framework for server-side rendering and routing
- **shadcn/ui** – Component library for a polished UI
- **LangChain TS** – LLM orchestration with `RunnableSequence` chains
- **HuggingFace Inference** – LLM backend via custom `ChatHuggingFaceAdapter`
- **YouTube Data API** – Fetches video details and captions

## Project Structure

```
lib/llm/
├── langchain.ts    # LangChain chains (expandQuery, batchRelevanceCheck)
├── hf-adapter.ts   # ChatHuggingFaceAdapter for @langchain/core
├── config.ts       # Model config, timeouts, retry settings
├── schemas.ts      # Zod schemas for validation
└── index.ts        # Public exports
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain JS/TS](https://js.langchain.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [YouTube Data API Overview](https://developers.google.com/youtube/v3)
- [HuggingFace Inference API](https://huggingface.co/docs/api-inference)
