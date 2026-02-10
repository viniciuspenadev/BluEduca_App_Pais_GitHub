'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';

export interface SmartBannerData {
    type: 'finance-overdue' | 'event-today' | 'finance-warning' | 'mural-highlight' | 'empty';
    title: string;
    message: string;
    actionLabel?: string;
    actionLink?: string;
    imageUrl?: string;
    isDueToday?: boolean;
    data?: any;
}

interface SmartBannersProps {
    banners: SmartBannerData[];
}

export const SmartBanners = ({ banners }: SmartBannersProps) => {
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const alerts = banners.filter(b => (b.type === 'finance-overdue' || b.type === 'finance-warning'));
    const relevantBanners = banners.filter(b => b.type === 'mural-highlight' || b.type === 'event-today');

    // Carousel Auto-Rotation 
    useEffect(() => {
        if (relevantBanners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % relevantBanners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [relevantBanners.length]);

    return (
        <div className="space-y-4">
            {/* Empty State / All Clear Banner ✨ (Glassmorphism Style) */}
            {alerts.length === 0 && (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] p-4 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-white">Em dia, sem novidades</h4>
                            <p className="text-xs text-white/70 font-medium">Tudo certo com a sua conta e mural.</p>
                        </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-white/40 mr-2" />
                </div>
            )}

            {/* 1. Finance / Critical Alerts (Global Full Width) 🚨 */}
            {alerts.map((alert, idx) => {
                const isOverdue = alert.type === 'finance-overdue';
                return (
                    <div
                        key={idx}
                        className={`
                            bg-gradient-to-r rounded-[28px] p-4 shadow-2xl text-white flex items-center justify-between relative group mb-4 overflow-hidden
                            ${isOverdue ? 'from-red-600 to-red-800' :
                                alert.isDueToday ? 'from-amber-500 to-amber-600' : 'from-brand-600 to-brand-800'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-white">
                                    {alert.title}
                                </h4>
                                <p className="text-xs text-white/90">
                                    {alert.message}
                                </p>
                            </div>
                        </div>
                        {alert.actionLink && (
                            <Link
                                href={alert.actionLink}
                                className="bg-white text-brand-900 text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-white/90 active:scale-95 transition-transform whitespace-nowrap ml-2"
                                style={{ color: isOverdue ? '#dc2626' : '#4f46e5' }}
                            >
                                {alert.actionLabel || 'Resolver'}
                            </Link>
                        )}
                    </div>
                );
            })}

            {/* 2. Mural / Highlights Carousel */}
            {relevantBanners.length > 0 && (() => {
                const banner = relevantBanners[currentBannerIndex];
                return (
                    <div className="relative h-[200px] md:h-[320px] w-full rounded-[28px] border border-white/10 overflow-hidden shadow-2xl group">
                        <div key={currentBannerIndex} className="absolute inset-0">
                            <Image
                                src={banner.imageUrl || 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1000&auto=format&fit=crop'}
                                alt={banner.title}
                                fill
                                className="object-cover"
                                priority={true}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Content */}
                            <Link href={banner.actionLink || '#'} className="absolute bottom-0 left-0 right-0 p-5 md:p-8 cursor-pointer z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`
                                        text-[10px] md:text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-xl border border-white/20 shadow-sm
                                        ${banner.type === 'event-today' ? 'bg-purple-500/90 text-white' : 'bg-brand-500/90 text-white'}
                                    `}>
                                        {banner.type === 'event-today' ? 'HOJE' : 'DESTAQUE'}
                                    </span>
                                </div>
                                <h4 className="text-xl md:text-3xl font-bold text-white leading-tight mb-2 drop-shadow-md max-w-2xl">{banner.title}</h4>
                                <p className="text-sm md:text-base font-medium text-gray-200 line-clamp-1 md:line-clamp-2 opacity-90 max-w-xl">{banner.message}</p>
                            </Link>
                        </div>

                        {/* Dots Indicator */}
                        {relevantBanners.length > 1 && (
                            <div className="absolute bottom-3 right-4 md:bottom-6 md:right-8 flex gap-1.5 z-20">
                                {relevantBanners.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`
                                            w-1.5 h-1.5 rounded-full transition-all duration-300 
                                            ${idx === currentBannerIndex ? 'bg-white w-3 md:w-4' : 'bg-white/40'}
                                        `}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};
