'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { VideoGrid } from './components/VideoGrid';
import { searchTravelShorts } from './actions';
import { Video } from './components/VideoCard';
import { VideoModal } from './components/VideoModal';
import { ExportPanel } from './components/ExportPanel';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  const {
    data: videos = [],
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: ['travel-shorts', searchQuery],
    queryFn: () => searchTravelShorts(searchQuery),
    enabled: !!searchQuery,
    staleTime: 60 * 60 * 1000, // 1 hour client cache
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Clear selection when search query changes
    setSelectedVideoIds(new Set());
  };

  const handleToggleSelect = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedVideoIds(new Set(videos.map((v) => v.id)));
  };

  const handleDeselectAll = () => {
    setSelectedVideoIds(new Set());
  };

  const selectedVideos = videos.filter((video) => selectedVideoIds.has(video.id));

  return (
    <DashboardLayout onSearch={handleSearch} isLoading={isLoading}>
      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        hasSearched={isFetched}
        onVideoSelect={setSelectedVideo}
        selectedVideoIds={selectedVideoIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      <VideoModal
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      <ExportPanel selectedVideos={selectedVideos} />
    </DashboardLayout>
  );
}
