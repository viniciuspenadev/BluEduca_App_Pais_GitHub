export default function Loading() {
    return (
        <div className="animate-fade-in p-4 space-y-6">
            <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
                        <div className="h-3 w-12 bg-gray-100 rounded mx-auto animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
