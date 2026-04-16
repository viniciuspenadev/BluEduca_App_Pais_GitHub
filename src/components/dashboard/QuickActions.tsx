'use client';

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
import { useStudent } from '@/contexts/StudentContext';

export const QuickActions = () => {
    const { alerts } = useAlerts();
    const { selectedStudent } = useStudent();

    const hasModule = (module: string) => {
        return !!selectedStudent?.config_modules?.[module];
    };

    const items = [
        { label: 'Atividades', icon: Clock, link: '/cronograma', color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Comunicados', icon: MessageCircle, link: '/comunicados', badge: alerts.messages, color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Financeiro', icon: CreditCard, link: '/financeiro', badge: alerts.financial, color: 'text-brand-600', bg: 'bg-brand-50', disabled: false },
        { label: 'Mensagens', icon: MessageCircle, link: '/chat', badge: alerts.chat, color: hasModule('chat') ? 'text-brand-600' : 'text-slate-400', bg: hasModule('chat') ? 'bg-brand-50' : 'bg-slate-100', disabled: !hasModule('chat') },

    ];

    return (
        <div>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                {items.map((item: any, idx) => {
                    const content = (
                        <div className={`flex flex-col items-center gap-2 group relative transition-all ${item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}>
                            <div
                                className={`
                                    w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-lg ${item.bg} ${item.color}
                                    flex items-center justify-center shadow-sm border border-black/5 relative
                                `}
                            >
                                <item.icon className="w-6 h-6 md:w-7 md:h-7" />
                                {!!item.badge && item.badge > 0 && !item.disabled && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[11px] md:text-sm ${item.disabled ? 'text-slate-400' : 'text-brand-600'}`}>{item.label}</span>
                        </div>
                    );

                    if (item.disabled) {
                        return (
                            <button key={idx} onClick={() => window.alert("Módulo Inativo: O atendimento via chat não está habilitado para esta escola.")} className="focus:outline-none">
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link key={idx} href={item.link} prefetch={true}>
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
