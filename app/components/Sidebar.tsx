import { Home, TrendingUp, Bookmark, Settings, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
    return (
        <div className="w-64 border-r bg-card h-screen fixed left-0 top-0 flex flex-col hidden md:flex z-50">
            <div className="p-6 border-b flex items-center gap-2">
                <Map className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Travel Curator</h1>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2">
                <Button variant="secondary" className="w-full justify-start gap-2">
                    <Home className="w-4 h-4" />
                    Discover
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Bookmark className="w-4 h-4" />
                    Saved
                </Button>
            </div>

            <div className="p-4 border-t">
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                </Button>
            </div>
        </div>
    );
}
