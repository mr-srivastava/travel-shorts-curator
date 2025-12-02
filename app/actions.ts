'use server';

import { expandQuery, batchRelevanceCheck } from '@/lib/llm';
import pLimit from 'p-limit';

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
async function searchTravelShortsInternal(query: string): Promise<VideoResult[]> {
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

    const allItems: YouTubeSearchItem[] = [];

    /* -----------------------------------------------------------
     * 2. YouTube Search for each expanded query
     * -----------------------------------------------------------*/
    for (const q of queriesToRun) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        q + ' #shorts',
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
        durationMap[item.id] = parseDuration(item.contentDetails?.duration) || 0;
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
        ',',
      )}&key=${YOUTUBE_API_KEY}`;

      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) continue;

        const channelData = (await res.json()) as YouTubeChannelResponse;
        channelData.items?.forEach((c) => {
          const avatar = c.snippet?.thumbnails?.high?.url || c.snippet?.thumbnails?.medium?.url;
          if (avatar) channelAvatarMap[c.id] = avatar;
        });
      } catch {
        // Silently ignore channel avatar fetch errors
      }
    }

    /* -----------------------------------------------------------
     * 6. Prepare LLM Batch Payload (with parallel transcript fetching)
     * -----------------------------------------------------------*/
    const limit = pLimit(5); // Max 5 concurrent fetches to avoid overwhelming API

    const videosForLLM = await Promise.all(
      uniqueItems.map((item) =>
        limit(async () => {
          const transcript = await fetchTranscriptSafely(item.id.videoId);

          return {
            id: item.id.videoId,
            text: `
Title: ${item.snippet.title}
Description: ${item.snippet.description}
Transcript: ${transcript.slice(0, 1000)}
`.trim(),
          };
        }),
      ),
    );

    /* -----------------------------------------------------------
     * 7. Batch Relevance Scoring (HuggingFace)
     * -----------------------------------------------------------*/
    const llmResults = await batchRelevanceCheck(query, videosForLLM);

    const llmMap: Record<string, number> = {};
    llmResults.forEach((v) => (llmMap[v.id] = v.score));

    /* -----------------------------------------------------------
     * 8. Final Scoring (LLM + keywords + views + spam filter + recency)
     * -----------------------------------------------------------*/
    // Spam indicators to filter out non-travel content
    const SPAM_INDICATORS = [
      'prank',
      'challenge',
      'reaction',
      'storytime',
      'grwm',
      'ootd',
      'unboxing',
      'haul',
      'tiktok',
      'meme',
      'compilation',
      'funny',
      'exposed',
      'drama',
      'tea',
      'gossip',
    ];

    const scored: VideoResult[] = uniqueItems.map((item) => {
      const id = item.id.videoId;
      const llm = llmMap[id] ?? 0.5;

      const titleLower = item.snippet.title.toLowerCase();
      const descLower = item.snippet.description.toLowerCase();

      const keywordMatch = TRAVEL_KEYWORDS.some((k) => titleLower.includes(k)) ? 1 : 0;

      // Check for spam indicators
      const hasSpam = SPAM_INDICATORS.some((s) => titleLower.includes(s) || descLower.includes(s));
      const spamPenalty = hasSpam ? 0.3 : 1.0; // Reduce score by 70% if spam detected

      // Enhanced engagement with recency boost
      const views = parseInt(viewCountMap[id] || '0', 10);
      const publishedAt = new Date(item.snippet.publishedAt);
      const daysSinceUpload = Math.max((Date.now() - publishedAt.getTime()) / 86400000, 1);

      // Boost recent videos (exponential decay over 60 days)
      const recencyBoost = Math.min(Math.exp(-daysSinceUpload / 60), 1);
      const viewsPerDay = views / daysSinceUpload;

      // Combined engagement: raw views + recency + velocity
      const baseEngagement = Math.min(Math.log10(views + 1) / 7, 1);
      const velocityEngagement = Math.min(Math.log10(viewsPerDay + 1) / 5, 1);
      const engagement = baseEngagement * 0.6 + velocityEngagement * 0.2 + recencyBoost * 0.2;

      const score = (0.7 * llm + 0.15 * keywordMatch + 0.15 * engagement) * spamPenalty;

      return {
        id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        viewCount: viewCountMap[id],
        duration: durationMap[id],
        channelAvatarUrl: channelAvatarMap[channelIdMap[id]],
        relevanceScore: score,
        relevanceReason: `LLM=${llm.toFixed(2)}, kw=${keywordMatch}, eng=${engagement.toFixed(
          2,
        )} (${daysSinceUpload.toFixed(0)}d old)${hasSpam ? ' [spam]' : ''}`,
      };
    });

    /* -----------------------------------------------------------
     * 9. Sort & Return Top
     * -----------------------------------------------------------*/
    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 12);
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
