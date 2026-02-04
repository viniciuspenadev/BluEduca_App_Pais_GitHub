'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Baby } from 'lucide-react';
import Link from 'next/link';

export interface FeedItemData {
    id: string;
    type: 'grade' | 'attendance' | 'event' | 'finance' | 'diary' | 'notice' | 'alert';
    title: string;
    today: boolean;
    isClassSpecific: boolean;
    date: Date;
    description?: string;
    value?: string;
    status?: 'good' | 'bad' | 'neutral' | 'info';
    is_pinned?: boolean;
    location?: string;
    eventType?: string;
}

interface DashboardFeedProps {
    items: FeedItemData[];
}

export const DashboardFeed = ({ items }: DashboardFeedProps) => {
    return (
        <div className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-bold text-gray-900">Mural & Atualizações</h3>
                {items.length > 0 && (
                    <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                        {items.length} novas
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`
                            relative bg-white p-4 md:p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow
                            ${item.is_pinned ? 'bg-brand-50/30 border-brand-100' : 'border-gray-100'}
                        `}
                    >
                        {item.is_pinned && (
                            <div className="absolute -top-1 -right-1 bg-brand-500 text-white p-0.5 rounded-full shadow-sm z-10">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 3H16.1L18.1 5L18 5L16 3ZM5 21V19H7.09L15.09 11H12.5V8.41L5 15.91V21H5Z" /></svg>
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            {/* Date Box */}
                            <div className={`
                                w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border mt-0.5
                                ${item.type === 'notice' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                    item.type === 'alert' ? 'bg-red-50 border-red-100 text-red-600' :
                                        'bg-brand-50 border-brand-100 text-brand-600'}
                            `}>
                                <span className="text-[10px] md:text-xs uppercase font-bold leading-none mb-0.5">{format(new Date(item.date), 'MMM', { locale: ptBR })}</span>
                                <span className="text-lg md:text-xl font-bold leading-none">{format(new Date(item.date), 'dd')}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    {item.isClassSpecific && <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 uppercase tracking-wide">Turma</span>}
                                    {item.today && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wide">Hoje</span>}
                                    {item.type === 'alert' && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide">Importante</span>}
                                    {item.type === 'event' && item.eventType && (
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                                            {item.eventType === 'academic' ? 'Acadêmico' : item.eventType === 'holiday' ? 'Feriado' : item.eventType === 'meeting' ? 'Reunião' : 'Geral'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm md:text-base font-bold leading-snug truncate ${item.is_pinned ? 'text-brand-900' : 'text-gray-900'}`}>{item.title}</h4>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{item.type === 'event' ? format(new Date(item.date), 'HH:mm') : ''}</span>
                                </div>

                                <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>
                                {item.location && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                        {item.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Baby className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium text-sm">Nenhum aviso ou evento próximo.</p>
                        <Link href="/agenda" className="text-xs text-brand-600 font-bold hover:underline mt-2">
                            Ver calendário completo
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};
