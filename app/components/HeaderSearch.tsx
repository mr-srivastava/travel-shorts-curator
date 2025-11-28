"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface HeaderSearchProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
}

export function HeaderSearch({ onSearch, isLoading }: HeaderSearchProps) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-2xl">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search travel videos for destinations like Goa, Paris, Tokyo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-xl border border-gray-300 shadow-sm bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
                    disabled={isLoading}
                />
            </div>
            <Button type="submit" className="h-12 px-6 rounded-xl" disabled={isLoading}>
                Search
            </Button>
        </form>
    );
}
