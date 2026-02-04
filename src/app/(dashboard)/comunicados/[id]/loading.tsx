export default function CommunicationDetailLoading() {
    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col md:max-w-xl md:mx-auto md:relative animate-pulse">
            {/* Header Skeleton */}
            <header className="shrink-0 h-16 bg-white border-b border-gray-100 px-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-100 rounded-lg" />
                    <div className="h-2 w-16 bg-gray-50 rounded-full" />
                </div>
            </header>

            {/* Content Skeleton */}
            <main className="flex-1 bg-[#F2F2F7] px-4 py-6 space-y-6">
                <div className="bg-white rounded-[24px] h-64 w-full" />
                <div className="flex justify-end">
                    <div className="w-3/4 h-16 bg-blue-50 rounded-[18px]" />
                </div>
            </main>

            {/* Input Skeleton */}
            <div className="shrink-0 bg-white border-t border-gray-100 p-2 pb-6">
                <div className="h-12 bg-gray-100 rounded-full mx-4" />
            </div>
        </div>
    );
}
