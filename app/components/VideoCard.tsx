import { PlayCircle, Check } from 'lucide-react';
import Image from 'next/image';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  viewCount?: string;
  relevanceScore?: number;
  relevanceReason?: string;
  duration?: number;
  channelAvatarUrl?: string;
}

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  isSelected?: boolean;
  onToggleSelect?: (videoId: string) => void;
}

function formatViewCount(count?: string): string {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M Views`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 0)}K Views`;
  }
  return `${num} Views`;
}

export function VideoCard({ video, onSelect, isSelected = false, onToggleSelect }: VideoCardProps) {
  const viewText = formatViewCount(video.viewCount);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(video.id);
    }
  };

  return (
    <div className="group cursor-pointer relative" onClick={() => onSelect(video)}>
      {/* Thumbnail Container */}
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl mb-3">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        />

        {/* Selection checkbox overlay */}
        {onToggleSelect && (
          <div className="absolute top-3 left-3 z-10" onClick={handleCheckboxClick}>
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white/90 border-white/90 hover:bg-white'
              }`}
            >
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}

        {/* Gradient overlay at bottom for view count */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* View count overlay */}
        {viewText && (
          <div className="absolute bottom-3 left-3">
            <span className="text-white text-sm font-semibold drop-shadow-lg">{viewText}</span>
          </div>
        )}

        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <PlayCircle className="w-8 h-8 text-gray-900 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold leading-snug line-clamp-2 mb-2 text-gray-900"
        title={video.title}
      >
        {video.title}
      </h3>

      {/* Channel info */}
      <div className="flex items-center gap-2">
        {video.channelAvatarUrl ? (
          <Image
            src={video.channelAvatarUrl}
            alt={video.channelTitle}
            width={24}
            height={24}
            className="rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {video.channelTitle.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs text-gray-500 line-clamp-1">{video.channelTitle}</span>
      </div>
    </div>
  );
}
