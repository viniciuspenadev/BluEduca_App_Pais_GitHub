export default function CronogramaLoading() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-4 px-4 overflow-hidden animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="h-8 w-32 bg-slate-100 rounded-lg" />
                <div className="flex gap-1">
                    <div className="w-8 h-8 bg-slate-100 rounded-full" />
                    <div className="w-8 h-8 bg-slate-100 rounded-full" />
                </div>
            </div>

            {/* Calendar Strip Skeleton */}
            <div className="flex justify-between gap-2 mb-8 overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-14 h-20 bg-slate-50 rounded-2xl flex-shrink-0" />
                ))}
            </div>

            {/* Event Cards Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="w-16 pt-2">
                            <div className="h-4 w-10 bg-slate-100 rounded mb-1" />
                            <div className="h-3 w-8 bg-slate-50 rounded" />
                        </div>
                        <div className="flex-1 h-24 bg-slate-50 rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
