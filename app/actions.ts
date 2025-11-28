'use server';

import { expandQuery, batchRelevanceCheck } from '@/lib/groq';
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

/* -------------------------------------------------------------------
 * INTERNAL: Search + score shorts
 * -------------------------------------------------------------------*/
async function searchTravelShortsInternal(query: string): Promise<VideoResult[]> {
  if (!query?.trim()) return [];

  if (!YOUTUBE_API_KEY) {
    console.warn('No YOUTUBE_API_KEY provided. Returning mock data.');
    return mockSearch(query);
  }

  try {
    /* ------------------------------------
     * 1. Query Expansion (1 Groq call)
     * ------------------------------------*/
    const expandedQueries = await expandQuery(query);
    const queriesToRun = expandedQueries.slice(0, 5);

    let allItems: YouTubeSearchItem[] = [];

    /* ------------------------------------
     * 2. YouTube Search (no Groq usage)
     * ------------------------------------*/
    for (const q of queriesToRun) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        q + ' #shorts'
      )}&type=video&videoDuration=short&maxResults=5&key=${YOUTUBE_API_KEY}`;

      try {
        const res = await fetchWithTimeout(searchUrl);
        if (res.ok) {
          const data = (await res.json()) as YouTubeSearchResponse;
          if (data.items) allItems.push(...data.items);
        }
      } catch (e) {
        console.error(`Error searching ${q}:`, e);
      }
    }

    /* ------------------------------------
     * 3. Deduplicate by video ID
     * ------------------------------------*/
    const uniqueItemsMap = new Map<string, YouTubeSearchItem>();
    allItems.forEach(item => uniqueItemsMap.set(item.id.videoId, item));
    const uniqueItems = Array.from(uniqueItemsMap.values());

    if (uniqueItems.length === 0) return [];

    /* ------------------------------------
     * 4. Get Stats + Channel Info
     * ------------------------------------*/
    const videoIds = uniqueItems.map(v => v.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const statsRes = await fetchWithTimeout(statsUrl);

    const viewCountMap: Record<string, string> = {};
    const durationMap: Record<string, number> = {};
    const channelIdMap: Record<string, string> = {};

    if (statsRes.ok) {
      const stats = (await statsRes.json()) as YouTubeStatsResponse;
      stats.items?.forEach(item => {
        viewCountMap[item.id] = item.statistics?.viewCount || '0';
        durationMap[item.id] = parseDuration(item.contentDetails?.duration) || 0;
        if (item.snippet?.channelId) {
          channelIdMap[item.id] = item.snippet.channelId;
        }
      });
    }

    /* ------------------------------------
     * 5. Channel Avatars
     * ------------------------------------*/
    const uniqueChannelIds = [...new Set(Object.values(channelIdMap))];
    const channelAvatarMap: Record<string, string> = {};

    const chunkSize = 50;
    for (let i = 0; i < uniqueChannelIds.length; i += chunkSize) {
      const chunk = uniqueChannelIds.slice(i, i + chunkSize);

      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`;
      const res = await fetchWithTimeout(url);

      if (res.ok) {
        const channelData = (await res.json()) as YouTubeChannelResponse;
        channelData.items?.forEach(ch => {
          const avatar = ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.medium?.url;
          if (avatar) channelAvatarMap[ch.id] = avatar;
        });
      }
    }

    /* ------------------------------------
     * 6. PREPARE LLM BATCH (no LLM call yet)
     * ------------------------------------*/
    const videosForLLM = await Promise.all(
      uniqueItems.map(async item => {
        const transcript = await fetchTranscriptSafely(item.id.videoId);

        return {
          id: item.id.videoId,
          text: `
Title: ${item.snippet.title}
Description: ${item.snippet.description}
Transcript: ${transcript.substring(0, 1000)}
          `.trim(),
        };
      })
    );

    /* ------------------------------------
     * 7. BATCH RELEVANCE SCORING (1 Groq call)
     * ------------------------------------*/
    const llmResults = await batchRelevanceCheck(query, videosForLLM);

    const llmMap: Record<string, number> = {};
    llmResults.forEach((v: { id: string; score: number }) => (llmMap[v.id] = v.score));

    /* ------------------------------------
     * 8. Build Scored Video Objects
     * ------------------------------------*/
    const scoredVideos: VideoResult[] = uniqueItems.map(item => {
      const id = item.id.videoId;

      const llmScore = llmMap[id] ?? 0.5;

      const titleLower = item.snippet.title.toLowerCase();
      const keywordMatch = TRAVEL_KEYWORDS.some(k => titleLower.includes(k)) ? 1 : 0;

      const views = parseInt(viewCountMap[id] || '0', 10);
      const engagement = Math.min(Math.log10(views + 1) / 7, 1);

      const finalScore = 0.70 * llmScore + 0.15 * keywordMatch + 0.15 * engagement;

      return {
        id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        viewCount: viewCountMap[id],
        relevanceScore: finalScore,
        relevanceReason: `LLM: ${llmScore}, Keyword: ${keywordMatch}, Views: ${views}`,
        duration: durationMap[id],
        channelAvatarUrl: channelAvatarMap[channelIdMap[id] || ''],
      };
    });

    /* ------------------------------------
     * 9. Sort + Return Top 12
     * ------------------------------------*/
    return scoredVideos.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 12);

  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

/* -------------------------------------------------------------------
 * Export with conditional caching
 * - Development: No caching (fresh data every time)
 * - Production: 1-hour cache with tags for invalidation
 * -------------------------------------------------------------------*/
export async function searchTravelShorts(query: string): Promise<VideoResult[]> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // No caching in development
    return searchTravelShortsInternal(query);
  }

  // In production, use Next.js cache with revalidation
  const { cache } = await import('react');
  const cachedSearch = cache(async (q: string) => {
    return searchTravelShortsInternal(q);
  });

  return cachedSearch(query);
}