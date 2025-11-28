'use server';

import { unstable_cache } from 'next/cache';
import { expandQuery, relevanceCheck } from '@/lib/groq';
// import { embed, cosineSimilarity } from '@/lib/voyage'; // Skipping embeddings
import {
  fetchWithTimeout,
  fetchTranscriptSafely,
  parseDuration,
  mockSearch,
  TRAVEL_KEYWORDS
} from '@/lib/youtube';
import {
  VideoResult,
  YouTubeSearchItem,
  YouTubeSearchResponse,
  YouTubeStatsResponse,
  YouTubeChannelResponse
} from '@/lib/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Internal search function
async function searchTravelShortsInternal(query: string): Promise<VideoResult[]> {
  if (!query?.trim()) return [];

  if (!YOUTUBE_API_KEY) {
    console.warn('No YOUTUBE_API_KEY provided. Returning mock data.');
    return mockSearch(query);
  }

  try {
    // 1. Expand Query
    const expandedQueries = await expandQuery(query);
    console.log(`Expanded queries: ${expandedQueries.join(', ')}`);

    // 2. Search YT for each query (limit to top 2 per query to keep total reasonable)
    let allItems: YouTubeSearchItem[] = [];

    // Limit to first 5 expanded queries to save API quota and time
    const queriesToRun = expandedQueries.slice(0, 5);

    for (const q of queriesToRun) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        q + ' #shorts'
      )}&type=video&videoDuration=short&maxResults=5&key=${YOUTUBE_API_KEY}`;

      try {
        const searchRes = await fetchWithTimeout(searchUrl);
        if (searchRes.ok) {
          const data = await searchRes.json() as YouTubeSearchResponse;
          if (data.items) {
            allItems.push(...data.items);
          }
        }
      } catch (err) {
        console.error(`Error searching for ${q}:`, err);
      }
    }

    // Deduplicate by videoId
    const uniqueItemsMap = new Map<string, YouTubeSearchItem>();
    allItems.forEach(item => uniqueItemsMap.set(item.id.videoId, item));
    const uniqueItems = Array.from(uniqueItemsMap.values());

    if (uniqueItems.length === 0) return [];

    // 3. Get stats and channel info
    const videoIds = uniqueItems.map(item => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const statsRes = await fetchWithTimeout(statsUrl);

    const viewCountMap: Record<string, string> = {};
    const durationMap: Record<string, number> = {};
    const channelIdMap: Record<string, string> = {};

    if (statsRes.ok) {
      const statsData = await statsRes.json() as YouTubeStatsResponse;
      if (statsData.items) {
        for (const item of statsData.items) {
          viewCountMap[item.id] = item.statistics?.viewCount || '0';
          const duration = parseDuration(item.contentDetails?.duration);
          if (duration !== undefined) durationMap[item.id] = duration;
          if (item.snippet?.channelId) channelIdMap[item.id] = item.snippet.channelId;
        }
      }
    }

    // 4. Fetch channel avatars
    const uniqueChannelIds = [...new Set(Object.values(channelIdMap))];
    const channelAvatarMap: Record<string, string> = {};
    if (uniqueChannelIds.length > 0) {
      // Chunk channel IDs if too many (max 50 per request)
      const channelChunks = [];
      for (let i = 0; i < uniqueChannelIds.length; i += 50) {
        channelChunks.push(uniqueChannelIds.slice(i, i + 50));
      }

      for (const chunk of channelChunks) {
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`;
        const channelRes = await fetchWithTimeout(channelUrl);
        if (channelRes.ok) {
          const channelData = await channelRes.json() as YouTubeChannelResponse;
          if (channelData.items) {
            for (const channel of channelData.items) {
              const avatarUrl = channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.medium?.url;
              if (avatarUrl) channelAvatarMap[channel.id] = avatarUrl;
            }
          }
        }
      }
    }

    // 5. Embed User Query (SKIPPED - embeddings disabled)
    // const queryEmbedding = await embed(query);

    // 6. Process Videos: Fetch Transcripts, Score
    const scoredVideos: VideoResult[] = [];

    // Process in batches
    const concurrencyLimit = 5;
    for (let i = 0; i < uniqueItems.length; i += concurrencyLimit) {
      const batch = uniqueItems.slice(i, i + concurrencyLimit);

      const batchResults = await Promise.allSettled(batch.map(async (item) => {
        const videoId = item.id.videoId;
        const transcript = await fetchTranscriptSafely(videoId);

        // Combine text for LLM judging
        const combinedText = `
Title: ${item.snippet.title}
Description: ${item.snippet.description}
Transcript: ${transcript.substring(0, 1000)}
            `.trim();

        // Embed Video (SKIPPED - embeddings disabled)
        // const videoEmbedding = await embed(combinedText);

        // Calculate Semantic Similarity (SKIPPED - embeddings disabled)
        const semanticSimilarity = 0; // Disabled embeddings

        // LLM Relevance Judge
        const llmScore = await relevanceCheck(combinedText, query);

        // Keyword Match (Simple fallback/boost)
        const titleLower = item.snippet.title.toLowerCase();
        const keywordMatch = TRAVEL_KEYWORDS.some(k => titleLower.includes(k)) ? 1 : 0;

        // Engagement Factor (log scale view count)
        const views = parseInt(viewCountMap[videoId] || '0', 10);
        const engagementFactor = Math.min(Math.log10(views + 1) / 7, 1); // Normalize roughly 0-1

        // Final Score Formula (adjusted weights since embeddings are disabled)
        // Original: 0.45 * semanticSimilarity + 0.35 * llmRelevance + 0.10 * keywordMatch + 0.10 * engagementFactor
        // New: 0.70 * llmRelevance + 0.15 * keywordMatch + 0.15 * engagementFactor
        const finalScore = (0.70 * llmScore) + (0.15 * keywordMatch) + (0.15 * engagementFactor);

        return {
          id: videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          channelTitle: item.snippet.channelTitle,
          viewCount: viewCountMap[videoId],
          relevanceScore: finalScore,
          relevanceReason: `Semantic: ${semanticSimilarity.toFixed(2)}, LLM: ${llmScore}, Views: ${views}`,
          duration: durationMap[videoId],
          channelAvatarUrl: channelAvatarMap[channelIdMap[videoId] || ''],
        };
      }));

      for (const res of batchResults) {
        if (res.status === 'fulfilled') {
          scoredVideos.push(res.value);
        }
      }
    }

    // 7. Sort and Return Top 12
    return scoredVideos
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 12);

  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

// Export cached version
export const searchTravelShorts = unstable_cache(
  async (query: string) => searchTravelShortsInternal(query),
  ['travel-shorts-search'],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ['travel-shorts'],
  },
);
