'use server';

import { expandQuery, batchRelevanceCheck } from '@/lib/huggingface';

import {
  fetchWithTimeout,
  fetchTranscriptSafely,
  parseDuration,
  mockSearch,
  TRAVEL_KEYWORDS,
} from '@/lib/youtube';

import {
  VideoResult,
  YouTubeSearchItem,
  YouTubeSearchResponse,
  YouTubeStatsResponse,
  YouTubeChannelResponse,
} from '@/lib/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/* -------------------------------------------------------------------
 * INTERNAL: Search + score shorts
 * -------------------------------------------------------------------*/
async function searchTravelShortsInternal(
  query: string
): Promise<VideoResult[]> {
  if (!query?.trim()) return [];

  if (!YOUTUBE_API_KEY) {
    console.warn('Missing YOUTUBE_API_KEY → returning mock results.');
    return mockSearch(query);
  }

  try {
    /* -----------------------------------------------------------
     * 1. Query Expansion (HuggingFace)
     * -----------------------------------------------------------*/
    const expandedQueries = await expandQuery(query);
    const queriesToRun = expandedQueries.slice(0, 5);

    let allItems: YouTubeSearchItem[] = [];

    /* -----------------------------------------------------------
     * 2. YouTube Search for each expanded query
     * -----------------------------------------------------------*/
    for (const q of queriesToRun) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        q + ' #shorts'
      )}&type=video&videoDuration=short&maxResults=5&key=${YOUTUBE_API_KEY}`;

      try {
        const res = await fetchWithTimeout(url);
        if (res.ok) {
          const data = (await res.json()) as YouTubeSearchResponse;
          if (data.items) allItems.push(...data.items);
        }
      } catch (e) {
        console.error('YouTube search error:', e);
      }
    }

    /* -----------------------------------------------------------
     * 3. Deduplicate videos
     * -----------------------------------------------------------*/
    const uniqueMap = new Map<string, YouTubeSearchItem>();
    allItems.forEach((item) => uniqueMap.set(item.id.videoId, item));
    const uniqueItems = [...uniqueMap.values()];
    if (!uniqueItems.length) return [];

    /* -----------------------------------------------------------
     * 4. Fetch Stats + Channel information
     * -----------------------------------------------------------*/
    const videoIds = uniqueItems.map((v) => v.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const statsRes = await fetchWithTimeout(statsUrl);

    const viewCountMap: Record<string, string> = {};
    const durationMap: Record<string, number> = {};
    const channelIdMap: Record<string, string> = {};

    if (statsRes.ok) {
      const stats = (await statsRes.json()) as YouTubeStatsResponse;
      stats.items?.forEach((item) => {
        viewCountMap[item.id] = item.statistics?.viewCount || '0';
        durationMap[item.id] =
          parseDuration(item.contentDetails?.duration) || 0;
        channelIdMap[item.id] = item.snippet?.channelId ?? '';
      });
    }

    /* -----------------------------------------------------------
     * 5. Fetch Channel Avatars
     * -----------------------------------------------------------*/
    const channelAvatarMap: Record<string, string> = {};
    const uniqueChannelIds = [...new Set(Object.values(channelIdMap))];

    for (let i = 0; i < uniqueChannelIds.length; i += 50) {
      const chunk = uniqueChannelIds.slice(i, i + 50);
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${chunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`;

      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) continue;

        const channelData = (await res.json()) as YouTubeChannelResponse;
        channelData.items?.forEach((c) => {
          const avatar =
            c.snippet?.thumbnails?.high?.url ||
            c.snippet?.thumbnails?.medium?.url;
          if (avatar) channelAvatarMap[c.id] = avatar;
        });
      } catch (e) {}
    }

    /* -----------------------------------------------------------
     * 6. Prepare LLM Batch Payload
     * -----------------------------------------------------------*/
    const videosForLLM = await Promise.all(
      uniqueItems.map(async (item) => {
        const transcript = await fetchTranscriptSafely(item.id.videoId);

        return {
          id: item.id.videoId,
          text: `
Title: ${item.snippet.title}
Description: ${item.snippet.description}
Transcript: ${transcript.slice(0, 1000)}
`.trim(),
        };
      })
    );

    /* -----------------------------------------------------------
     * 7. Batch Relevance Scoring (HuggingFace)
     * -----------------------------------------------------------*/
    const llmResults = await batchRelevanceCheck(query, videosForLLM);

    const llmMap: Record<string, number> = {};
    llmResults.forEach((v) => (llmMap[v.id] = v.score));

    /* -----------------------------------------------------------
     * 8. Final Scoring (LLM + keywords + views)
     * -----------------------------------------------------------*/
    const scored: VideoResult[] = uniqueItems.map((item) => {
      const id = item.id.videoId;
      const llm = llmMap[id] ?? 0.5;

      const titleLower = item.snippet.title.toLowerCase();
      const keywordMatch = TRAVEL_KEYWORDS.some((k) => titleLower.includes(k))
        ? 1
        : 0;

      const views = parseInt(viewCountMap[id] || '0', 10);
      const engagement = Math.min(Math.log10(views + 1) / 7, 1);

      const score = 0.7 * llm + 0.15 * keywordMatch + 0.15 * engagement;

      return {
        id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        viewCount: viewCountMap[id],
        duration: durationMap[id],
        channelAvatarUrl: channelAvatarMap[channelIdMap[id]],
        relevanceScore: score,
        relevanceReason: `LLM=${llm}, kw=${keywordMatch}, views=${views}`,
      };
    });

    /* -----------------------------------------------------------
     * 9. Sort & Return Top
     * -----------------------------------------------------------*/
    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 12);
  } catch (e) {
    console.error('searchTravelShortsInternal error:', e);
    return [];
  }
}

/* -------------------------------------------------------------------
 * Export with caching rules
 * -------------------------------------------------------------------*/
export async function searchTravelShorts(query: string) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) return searchTravelShortsInternal(query);

  const { cache } = await import('react');
  const cached = cache(searchTravelShortsInternal);

  return cached(query);
}
