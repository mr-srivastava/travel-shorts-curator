# Travel Curator

Travel Curator is a modern web application built with **Next.js** and **shadcn/ui** that helps users discover relevant travel‑related YouTube Shorts. Users can search for a city or country, and the app fetches curated short videos using the YouTube Data API, ensuring the content is truly travel‑focused through transcript analysis.

## Features
- Clean, premium dashboard UI with dark‑mode support.
- Search bar to query destinations.
- Automatic relevance filtering based on video metadata, transcripts, and LLM scoring.
- Responsive grid of short video cards with embedded player modal.
- Fast development experience with hot‑module replacement.

## New Setup Overview
- **Embeddings Disabled** – No vector embeddings are generated. Relevance is judged using a HuggingFace LLM (`relevanceCheck`) combined with simple keyword matching and an engagement factor.
- **LLM Relevance Scoring** – The HuggingFace LLM (`relevanceCheck`) receives a prompt containing the video title, description, and transcript. It evaluates travel relevance using a custom prompt that emphasizes destination relevance, content quality, and user engagement, returning a relevance score between 0 (not relevant) and 1 (highly relevant).
- **Keyword Boost** – Travel‑specific keywords (e.g., flight, hotel, tour, guide, landmark) increase the final score.
- **Engagement Factor** – View counts are normalized on a log scale to favor popular videos.
- **Caching** – Search results are cached for 1 hour using `unstable_cache` to reduce API usage.
- **Environment Variables** – Set `YOUTUBE_API_KEY` (YouTube Data API) and `HF_TOKEN` (HuggingFace API token) in a `.env.local` file.

## Getting Started
```bash
# Install dependencies
npm install   # or yarn install / pnpm install

# Create a .env.local file with required keys
cat <<EOF > .env.local
YOUTUBE_API_KEY=your_youtube_api_key
GROQ_API_KEY=your_groq_api_key
EOF

# Run the development server
npm run dev   # or yarn dev
```
Open <http://localhost:3000> in your browser to view the app.

## Tech Stack
- **Next.js** – React framework for server‑side rendering and routing.
- **shadcn/ui** – Component library for a polished UI.
- **YouTube Data API** – Fetches video details and captions.
- **Groq LLM** – Performs relevance judgment on video content.

## Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [YouTube Data API Overview](https://developers.google.com/youtube/v3)
- [Groq API Docs](https://groq.com/docs)

## Deploy on Vercel
The easiest way to deploy your Next.js app is to use the Vercel Platform.

```bash
# Deploy with Vercel CLI (optional)
vercel
```
You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
