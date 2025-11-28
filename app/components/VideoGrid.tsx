import { Video, VideoCard } from "./VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface VideoGridProps {
    videos: Video[];
    isLoading: boolean;
    hasSearched: boolean;
    onVideoSelect: (video: Video) => void;
    selectedVideoIds?: Set<string>;
    onToggleSelect?: (videoId: string) => void;
    onSelectAll?: () => void;
    onDeselectAll?: () => void;
}

export function VideoGrid({ 
    videos, 
    isLoading, 
    hasSearched, 
    onVideoSelect,
    selectedVideoIds = new Set(),
    onToggleSelect,
    onSelectAll,
    onDeselectAll
}: VideoGridProps) {
    const selectedCount = selectedVideoIds.size;
    const allSelected = videos.length > 0 && selectedCount === videos.length;
    if (isLoading) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="aspect-[9/16] w-full rounded-2xl" />
                            <Skeleton className="h-4 w-3/4 rounded" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="w-6 h-6 rounded-full" />
                                <Skeleton className="h-3 w-1/2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (hasSearched && videos.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <p className="text-lg font-medium text-gray-700">No travel shorts found</p>
                <p className="text-sm mt-1">Try a different destination</p>
            </div>
        );
    }

    if (!hasSearched) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Selection Header */}
            {videos.length > 0 && (onSelectAll || onDeselectAll) && (
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">
                            {selectedCount > 0 
                                ? `${selectedCount} video${selectedCount === 1 ? '' : 's'} selected`
                                : 'No videos selected'
                            }
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {allSelected ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDeselectAll}
                            >
                                Deselect All
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onSelectAll}
                            >
                                Select All
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {videos.map((video) => (
                    <VideoCard 
                        key={video.id} 
                        video={video} 
                        onSelect={onVideoSelect}
                        isSelected={selectedVideoIds.has(video.id)}
                        onToggleSelect={onToggleSelect}
                    />
                ))}
            </div>
        </div>
    );
}
