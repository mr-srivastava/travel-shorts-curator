import { YoutubeTranscript } from 'youtube-transcript';
import { VideoResult, YouTubeSearchResponse, YouTubeStatsResponse, YouTubeChannelResponse } from './types';

export const TRAVEL_KEYWORDS = [
  'travel',
  'hotel',
  'food',
  'view',
  'amazing',
  'visit',
  'city',
  'guide',
  'trip',
  'vacation',
];

export const TITLE_KEYWORDS = ['travel', 'trip', 'visit'];

// Convert ISO 8601 duration to seconds
export function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined;

  // ISO 8601 format: PT1H2M10S (1 hour, 2 minutes, 10 seconds)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Fetch with timeout to prevent hanging requests
export async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch transcript with timeout and error handling
export async function fetchTranscriptSafely(videoId: string, timeoutMs = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    clearTimeout(timeout);

    return transcript
      .map((t) => t.text)
      .join(' ')
      .toLowerCase();
  } catch {
    // Transcript unavailable, disabled, or timeout
    return '';
  }
}

export function mockSearch(query: string): VideoResult[] {
  // Return some static mock data for testing UI
  return [
    {
      id: 'mock1',
      title: `Ultimate 5 Day ${query} Itinerary | Must Visit Places`,
      thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      channelTitle: 'Apoorva Rao',
      viewCount: '705000',
      duration: 50,
      channelAvatarUrl:
        'https://yt3.ggpht.com/pi8WfAkOunCZLYNrXXtBGlhHWmi5khV1zkSojXrRf4kish2VRs45o8yV27buYCF91LPWowGV9FQ=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.95,
      relevanceReason: 'Title matches. Transcript contains: travel, visit, city.',
    },
    {
      id: 'mock2',
      title: `#dudhsagar water falls | ${query} travel guide`,
      thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      channelTitle: 'urs@Raju',
      viewCount: '788000',
      duration: 45,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.85,
      relevanceReason: 'Title matches. Description matches.',
    },
    {
      id: 'mock3',
      title: `Perfect 5 days ${query} Itinerary | Travel Vlog`,
      thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
      channelTitle: 'Wandering Mi...',
      viewCount: '1200000',
      duration: 60,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.7,
      relevanceReason: 'Title matches.',
    },
    {
      id: 'mock4',
      title: `Hidden Gems in ${query} you MUST see!`,
      thumbnail: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=80',
      channelTitle: 'Travel Tips',
      viewCount: '523000',
      duration: 55,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.6,
      relevanceReason: 'Title matches.',
    },
    {
      id: 'mock5',
      title: `Best Street Food in ${query} | Food Tour`,
      thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
      channelTitle: 'Foodie Travels',
      viewCount: '892000',
      duration: 48,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.55,
      relevanceReason: 'Description matches.',
    },
    {
      id: 'mock6',
      title: `${query} Beach Life | Sunset Vibes`,
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      channelTitle: 'Beach Lover',
      viewCount: '445000',
      duration: 42,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.5,
      relevanceReason: 'Title matches.',
    },
    {
      id: 'mock7',
      title: `Budget Travel ${query} | Under $50/day`,
      thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
      channelTitle: 'Budget Explorer',
      viewCount: '1500000',
      duration: 65,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.45,
      relevanceReason: 'Title matches. Transcript contains: travel, hotel.',
    },
    {
      id: 'mock8',
      title: `Nightlife in ${query} | Club Hopping`,
      thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      channelTitle: 'Night Owl',
      viewCount: '678000',
      duration: 52,
      channelAvatarUrl: 'https://yt3.ggpht.com/default-avatar=s88-c-k-c0x00ffffff-no-rj',
      relevanceScore: 0.4,
      relevanceReason: 'Description matches.',
    },
  ];
}
