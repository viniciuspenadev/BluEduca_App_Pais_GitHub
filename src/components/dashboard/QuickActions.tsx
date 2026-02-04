'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    Clock,
    MessageCircle,
    CreditCard,
    LayoutGrid,
    GraduationCap,
    Heart,
    Calendar
} from 'lucide-react';

import { useAlerts } from '@/hooks/useAlerts';

export const QuickActions = () => {
    const { alerts } = useAlerts();

    // In a real implementation, we would check permissions/modules here.
    // For now, assuming all enabled.

    const items = [
        { label: 'Cronograma', icon: Clock, link: '/cronograma', color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Mensagens', icon: MessageCircle, link: '/comunicados', badge: alerts.messages, color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Financeiro', icon: CreditCard, link: '/financeiro', color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Boletim', icon: GraduationCap, link: '/boletim', color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
    ];

    return (
        <div>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                {items.map((item: any, idx) => (
                    <Link
                        key={idx}
                        href={item.disabled ? '#' : item.link}
                        prefetch={true}
                        className={`flex flex-col items-center gap-2 group relative ${item.disabled ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : ''}`}
                    >
                        <motion.div
                            whileTap={!item.disabled ? { scale: 0.95 } : {}}
                            className={`
                                w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-lg ${item.bg} ${item.color}
                                flex items-center justify-center shadow-sm border border-black/5
                                transition-transform relative
                            `}
                        >
                            <item.icon className="w-6 h-6 md:w-7 md:h-7" />
                            {!!item.badge && item.badge > 0 && !item.disabled && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-sm">
                                    {item.badge}
                                </span>
                            )}
                        </motion.div>
                        <span className="text-[11px] md:text-sm font-bold text-gray-500 group-hover:text-brand-600 transition-colors">{item.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};
