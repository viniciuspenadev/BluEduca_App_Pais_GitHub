'use client';

import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Loading() {
    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden"
        >
            {/* Header Skeleton */}
            <header className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-2 w-20 bg-gray-50 rounded-full animate-pulse" />
                </div>
            </header>

            {/* Content Skeleton */}
            <main className="flex-1 p-6 space-y-10 overflow-hidden">
                <div className="max-w-2xl mx-auto space-y-10">
                    <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                        <div className="h-14 bg-gray-50/50 animate-pulse" />
                        <div className="p-8 space-y-6">
                            <div className="h-8 w-3/4 bg-gray-50 rounded-xl animate-pulse" />
                            <div className="flex gap-2">
                                <div className="h-6 w-20 bg-gray-50 rounded-full animate-pulse" />
                                <div className="h-6 w-24 bg-gray-50 rounded-full animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                                <div className="h-4 w-11/12 bg-gray-50 rounded animate-pulse" />
                                <div className="h-4 w-10/12 bg-gray-50 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-end"><div className="h-12 w-48 bg-blue-50/50 rounded-[28px] animate-pulse" /></div>
                        <div className="flex justify-start"><div className="h-12 w-48 bg-gray-50 rounded-[28px] animate-pulse" /></div>
                    </div>
                </div>
            </main>

            {/* Input Skeleton */}
            <div className="p-4 pb-safe-area">
                <div className="max-w-2xl mx-auto h-16 bg-white rounded-[32px] border border-gray-100 shadow-sm animate-pulse" />
            </div>
        </motion.div>
    );
}
