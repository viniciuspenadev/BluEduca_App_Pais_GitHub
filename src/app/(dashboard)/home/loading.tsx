export default function DashboardLoading() {
    return (
        <div className="md:grid md:grid-cols-12 md:gap-6 items-start animate-pulse">
            {/* LEFT COLUMN */}
            <div className="md:col-span-8 space-y-6">

                {/* Smart Banners Skeleton */}
                <div className="h-40 bg-slate-100 rounded-[24px] w-full" />

                {/* Timeline Skeleton */}
                <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                    <div className="h-4 w-32 bg-slate-200 rounded-full mb-6" />
                    <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex-shrink-0 w-24 h-28 bg-white rounded-2xl" />
                        ))}
                    </div>
                </div>

                {/* Quick Actions Skeleton */}
                <div className="grid grid-cols-4 md:grid-cols-5 gap-3 py-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
                            <div className="w-12 h-3 bg-slate-50 rounded-full" />
                        </div>
                    ))}
                </div>

                {/* Highlights Skeleton */}
                <div className="bg-slate-50 rounded-[28px] p-6">
                    <div className="h-4 w-40 bg-slate-200 rounded-full mb-6" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-white rounded-2xl" />
                        <div className="h-20 bg-white rounded-2xl" />
                    </div>
                </div>

                {/* Feed Skeleton */}
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 h-32" />
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="md:col-span-4 space-y-6 hidden md:block">
                <div className="h-64 bg-slate-100 rounded-2xl" />
            </div>
        </div>
    );
}
