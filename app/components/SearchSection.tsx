"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchSectionProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
}

export function SearchSection({ onSearch, isLoading }: SearchSectionProps) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 text-center space-y-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Travel Curator</h1>
                <p className="text-muted-foreground text-lg">
                    Discover your next destination with curated travel shorts.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Enter a city or country (e.g., Goa, Japan)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-12 text-lg"
                    disabled={isLoading}
                />
                <Button type="submit" size="lg" className="h-12 px-8" disabled={isLoading}>
                    {isLoading ? (
                        "Searching..."
                    ) : (
                        <>
                            <Search className="mr-2 h-5 w-5" />
                            Search
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
