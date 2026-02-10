'use client';

import { usePathname } from 'next/navigation';

export function DashboardMain({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === '/home' || pathname === '/';

    return (
        <main
            className={`flex-1 overflow-y-auto pb-24 md:pb-8 scrollbar-hide w-full max-w-[1920px] mx-auto ${isHome ? 'px-0' : 'px-4 md:px-6 py-6 md:py-8'
                }`}
        >
            {/* Header Spacer - Only for non-home pages */}
            {!isHome && <div className="h-16 md:h-[72px] shrink-0" />}

            {children}
        </main>
    );
}
