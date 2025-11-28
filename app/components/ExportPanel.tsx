"use client";

import { Button } from "@/components/ui/button";
import { Video } from "./VideoCard";
import { Copy, Download } from "lucide-react";
import { useState } from "react";

interface ExportPanelProps {
    selectedVideos: Video[];
    onClose?: () => void;
}

function formatViewCount(count?: string): string {
    if (!count) return "0 Views";
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

function transformVideoForExport(video: Video) {
    return {
        videoId: video.id,
        url: video.thumbnail,
        duration: video.duration || 0,
        views: formatViewCount(video.viewCount),
        title: video.title,
        channelInfo: {
            url: video.channelAvatarUrl || null,
            navigation: null,
            userName: video.channelTitle,
        },
    };
}

export function ExportPanel({ selectedVideos, onClose }: ExportPanelProps) {
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    if (selectedVideos.length === 0) {
        return null;
    }

    const exportData = selectedVideos.map(transformVideoForExport);

    const handleCopyToClipboard = async () => {
        try {
            const jsonString = JSON.stringify(exportData, null, 2);
            await navigator.clipboard.writeText(jsonString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
        }
    };

    const handleDownloadJSON = () => {
        try {
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `travel-videos-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 2000);
        } catch (error) {
            console.error("Failed to download JSON:", error);
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center gap-4 min-w-[400px]">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                        {selectedVideos.length} video{selectedVideos.length === 1 ? "" : "s"} selected
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToClipboard}
                        className="flex items-center gap-2"
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleDownloadJSON}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {downloaded ? "Downloaded!" : "Download JSON"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

