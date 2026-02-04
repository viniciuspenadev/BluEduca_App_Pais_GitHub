export default function DiarioLoading() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-4 px-4 overflow-hidden animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-40 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-24 bg-slate-50 rounded-full" />
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
            </div>

            {/* Featured Card Skeleton */}
            <div className="h-48 bg-slate-50 rounded-[28px] mb-8" />

            {/* List Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl p-4 flex gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 w-3/4 bg-slate-50 rounded-full" />
                            <div className="h-3 w-1/2 bg-slate-50 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
