export default function FinanceLoading() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-4 px-4 overflow-hidden animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                    <div className="space-y-2">
                        <div className="h-6 w-32 bg-slate-100 rounded-lg" />
                        <div className="h-3 w-20 bg-slate-50 rounded-full" />
                    </div>
                </div>
                <div className="h-8 w-40 bg-slate-50 rounded-xl" />
            </div>

            {/* Hero Card Skeleton */}
            <div className="h-32 bg-slate-50 rounded-[28px] mb-8" />

            {/* Tabs Skeleton */}
            <div className="flex gap-2 mb-6">
                <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
                <div className="h-10 flex-1 bg-slate-50 rounded-xl" />
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-50 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
