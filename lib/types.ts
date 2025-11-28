export interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  viewCount?: string;
  relevanceScore: number;
  relevanceReason: string;
  duration?: number; // Duration in seconds
  channelAvatarUrl?: string;
}

// TypeScript types for YouTube API responses
export interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: { high: { url: string } };
  };
}

export interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: { message: string };
}

export interface YouTubeStatsItem {
  id: string;
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
  snippet?: { channelId?: string };
}

export interface YouTubeStatsResponse {
  items?: YouTubeStatsItem[];
  error?: { message: string };
}

export interface YouTubeChannelItem {
  id: string;
  snippet?: {
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

export interface YouTubeChannelResponse {
  items?: YouTubeChannelItem[];
  error?: { message: string };
}
