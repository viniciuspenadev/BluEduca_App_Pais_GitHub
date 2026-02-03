'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Data is fresh for 5 minutes (reduced DB load, faster UI)
                        staleTime: 5 * 60 * 1000,
                        // Cache persists for 30 minutes
                        gcTime: 30 * 60 * 1000,
                        // Retry failed requests once
                        retry: 1,
                        // Don't refetch every time the user clicks on the window
                        // this avoids the "flicker" when coming back to the tab
                        refetchOnWindowFocus: false,
                        // Serve from cache while updating in background
                        refetchOnMount: true,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
