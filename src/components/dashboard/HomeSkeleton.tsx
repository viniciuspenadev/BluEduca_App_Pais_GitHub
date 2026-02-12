'use client';

export const HomeSkeleton = () => {
    return (
        <div className="md:grid md:grid-cols-12 md:gap-6 items-start animate-pulse">
            {/* LEFT COLUMN */}
            <div className="md:col-span-8 relative flex flex-col min-h-[500px]">
                {/* 1. Background Bowl (Static) */}
                <div
                    className="absolute top-0 left-0 right-0 bg-brand-600 pointer-events-none"
                    style={{
                        height: '320px',
                        borderBottomLeftRadius: '50% 80px',
                        borderBottomRightRadius: '50% 80px',
                        zIndex: 0
                    }}
                />

                {/* 2. Info Layer (Skeleton) */}
                <div className="relative z-10 px-6 pt-safe-area pt-8">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            {/* Avatar Skeleton */}
                            <div className="w-16 h-16 rounded-full border-[3px] border-white/30 bg-white/20 shadow-lg" />

                            {/* Info Skeleton */}
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-white/30 rounded-md" />
                                <div className="h-3 w-24 bg-white/20 rounded-md" />
                            </div>
                        </div>

                        {/* Button Skeleton */}
                        <div className="p-3 bg-white/10 rounded-2xl w-12 h-12" />
                    </div>
                </div>

                {/* 3. Content Layer (Skeleton) */}
                <div className="relative z-20 px-4 space-y-6">
                    {/* Banner Skeleton */}
                    <div className="relative h-[200px] md:h-[320px] w-full rounded-3xl bg-slate-200 shadow-md" />

                    {/* Timeline Skeleton */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="h-6 w-40 bg-slate-100 rounded-md mb-6" />
                        <div className="flex justify-between items-center gap-4 overflow-x-hidden">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="h-4 w-10 bg-slate-50 rounded" />
                                    <div className="w-12 h-12 rounded-full bg-slate-100" />
                                    <div className="h-3 w-12 bg-slate-50 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Desktop Only */}
            <div className="md:col-span-4 space-y-6 hidden md:block mt-8">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm h-48" />
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm h-64" />
            </div>
        </div>
    );
};
