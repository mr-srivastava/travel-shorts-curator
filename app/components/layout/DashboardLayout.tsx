
import { HeaderSearch } from "../HeaderSearch";

interface DashboardLayoutProps {
    children: React.ReactNode;
    onSearch: (query: string) => void;
    isLoading: boolean;
}

export function DashboardLayout({ children, onSearch, isLoading }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            <div className="flex flex-col min-h-screen">
                <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center justify-center h-20 px-4 md:px-8">
                        <HeaderSearch onSearch={onSearch} isLoading={isLoading} />
                    </div>
                </header>

                <main className="flex-1 px-4 md:px-8 py-8 bg-muted/10">
                    {children}
                </main>
            </div>
        </div>
    );
}
