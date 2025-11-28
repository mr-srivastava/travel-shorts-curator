# How We Get Relevant Travel Shorts

Travel Curator fetches YouTube Shorts that are truly relevant to the user's travel query using a streamlined, LLM‑driven relevance pipeline:

1. **Search the YouTube Data API**
   - Query the API with the destination name (city, country, or region).
   - Request only short‑form videos (`videoDuration=short`).
   - Retrieve video metadata including title, description, tags, and `videoId`.

2. **Fetch Captions / Transcripts**
   - For each candidate video, request the automatically generated captions (if available) via the `captions` endpoint.
   - If captions are missing, fall back to the video description and title.

3. **Content Relevance Scoring**
   - **LLM Relevance Check**: Send the title, description, and transcript to the Groq LLM (`relevanceCheck`) to obtain a relevance score.
   - **Keyword Boost**: Travel‑specific keywords (e.g., "flight", "hotel", "tour", "guide", "landmark") increase the final score.
   - **Engagement Factor**: View counts are normalized on a log scale to favor popular videos.

4. **Ranking & Selection**
   - Combine the LLM score, keyword boost, and engagement factor into a final relevance score.
   - Sort videos by this score and select the top N (default 12) to display.
   - Ensure diversity by limiting the number of videos per channel.

5. **Caching**
   - Search results are cached for 1 hour using `unstable_cache` to reduce API usage for identical queries.

The final list of videos is passed to the UI, where each short is rendered as a card with an embedded player modal.
