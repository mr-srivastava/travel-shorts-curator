import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Video } from "./VideoCard";

interface VideoModalProps {
    video: Video | null;
    isOpen: boolean;
    onClose: () => void;
}

export function VideoModal({ video, isOpen, onClose }: VideoModalProps) {
    if (!video) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[90vw] sm:max-w-[450px] max-h-[90vh] p-0 bg-black border-none overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{video.title}</DialogTitle>
                </DialogHeader>
                <div className="relative w-full aspect-[9/16] max-h-[80vh] bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
                        title={video.title}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
