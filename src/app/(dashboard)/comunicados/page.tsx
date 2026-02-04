'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import {
    MessageCircle, Search, Filter,
    Zap, Loader2, MailOpen, Sparkles,
    CalendarCheck, BarChart2, Flame, Users
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
// Imports updated to include Link
import Link from 'next/link';
import clsx from 'clsx';


// Types matches legacy structure
interface Communication {
    id: string;
    title: string;
    target_type?: string;
    content: string;
    created_at: string;
    priority: number;
    metadata?: any;
    school_id: string;
    channel?: {
        name: string;
        color: string;
        icon_name?: string;
    };
    sender_profile?: {
        name: string;
    } | { name: string }[];
}

interface Recipient {
    id: string;
    communication_id: string;
    read_at: string | null;
    response?: any;
    communication: Communication;
    student?: {
        class_enrollments?: { class: { name: string } }[];
    }
}

// Helper for dynamic icons
const getIcon = (name: string, props: any = {}) => {
    if (!name) return <Icons.MessageSquare {...props} />;
    const iconName = name.charAt(0).toUpperCase() + name.slice(1);
    const Icon = (Icons as any)[iconName] || Icons.MessageSquare;
    return <Icon {...props} />;
};

export default function CommunicationsPage() {
    const { selectedStudent } = useStudent();
    const router = useRouter();
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'pending' | 'class'>('all');

    // Fetch Communications
    const { data: messages = [], isPending, isFetching } = useQuery({
        queryKey: ['communications', selectedStudent?.id],
        queryFn: async () => {
            // ... (keep logic same)
            if (!selectedStudent) return [];
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('communication_recipients')
                .select(`
                    id,
                    communication_id,
                    read_at,
                    response,
                    communication:communications!inner (
                        id,
                        title,
                        content,
                        target_type,
                        created_at,
                        priority,
                        school_id,
                        metadata,
                        channel:communication_channels (name, color, icon_name),
                        sender_profile:profiles!sender_profile_id(name)
                    ),
                    student:students (
                        class_enrollments (
                            class:classes (name)
                        )
                    )
                `)
                .eq('guardian_id', user.id)
                .eq('communication.school_id', selectedStudent.school_id)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Cast and return
            return (data as any[]).map(item => ({
                ...item,
                communication: item.communication
            })) as Recipient[];
        },
        enabled: !!selectedStudent
    });

    // Realtime Listener for New Messages
    useEffect(() => {
        if (!selectedStudent) return;

        const channel = supabase
            .channel('realtime-communications-list')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'communication_recipients',
                    // Filter by current user is handled efficiently by RLS policies on the socket connection
                    // but we can add an extra safety check in the callback if needed, or rely on invalidation
                },
                (payload) => {
                    console.log('⚡ [Realtime] Nova comunicação recebida:', payload);
                    // Invalidate to fetch the full relation data (sender, title, etc)
                    queryClient.invalidateQueries({ queryKey: ['communications', selectedStudent.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedStudent, queryClient, supabase]);

    const filteredMessages = messages.filter(msg => {
        // Text Search
        const term = searchTerm.toLowerCase();
        const title = msg.communication.title.toLowerCase();
        const channel = msg.communication.channel?.name.toLowerCase() || '';
        const matchesSearch = title.includes(term) || channel.includes(term);

        if (!matchesSearch) return false;

        // Chips Filter
        if (activeFilter === 'unread') return !msg.read_at;
        if (activeFilter === 'urgent') return msg.communication.priority === 2;
        if (activeFilter === 'pending') {
            const comm = msg.communication;
            const isRSVPorPoll = comm.metadata?.template === 'rsvp' || comm.metadata?.template === 'poll';
            return isRSVPorPoll && !msg.response;
        }
        if (activeFilter === 'class') return msg.communication.target_type === 'CLASS';

        return true;
    });

    const studentClassName = selectedStudent?.class_name || 'Turma';

    // ... (rest of helper logic)
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-500 bg-blue-50 text-blue-600',
        emerald: 'text-emerald-500 bg-emerald-50 text-emerald-600',
        amber: 'text-amber-500 bg-amber-50 text-amber-600',
        cyan: 'text-cyan-500 bg-cyan-50 text-cyan-600',
        indigo: 'text-indigo-500 bg-indigo-50 text-indigo-600',
        purple: 'text-purple-500 bg-purple-50 text-purple-600',
        rose: 'text-rose-500 bg-rose-50 text-rose-600',
        orange: 'text-orange-500 bg-orange-50 text-orange-600',
        green: 'text-green-500 bg-green-50 text-green-600',
        red: 'text-red-500 bg-red-50 text-red-600',
        yellow: 'text-yellow-500 bg-yellow-50 text-yellow-600',
    };

    return (
        <div className="flex flex-col relative min-h-screen pb-24">

            {/* Indicador de Atualização em background (discreto) */}


            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] pointer-events-none" />

            {/* FILTER BAR ERROR AREA FIX */}
            <div className="shrink-0 z-10 pt-4 sticky top-0 bg-gray-50/80 backdrop-blur-md pb-4">
                <div className="max-w-5xl mx-auto px-4 space-y-4">
                    <div className="bg-white rounded-[24px] p-2 shadow-sm border border-slate-100 flex items-center gap-2">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar comunicados..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50/50 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm font-bold placeholder:text-slate-400 focus:bg-white transition-all outline-none text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                        {[
                            { id: 'all', label: 'Tudo', icon: MessageCircle },
                            { id: 'unread', label: 'Não Lidos', icon: MailOpen },
                            { id: 'urgent', label: 'Urgentes', icon: Zap },
                            { id: 'pending', label: 'Pendentes', icon: Flame },
                            { id: 'class', label: studentClassName, icon: Users },
                        ].map((item) => {
                            const active = activeFilter === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveFilter(item.id as any)}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0",
                                        active
                                            ? "bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/20 scale-105"
                                            : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* LIST AREA */}
            <div className="flex-1 relative z-0">
                <div className="max-w-5xl mx-auto">
                    {isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando Mensagens</span>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center text-slate-100">
                                <MessageCircle size={48} strokeWidth={1} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-800">Tudo em dia!</h3>
                                <p className="text-sm text-slate-400 font-medium">Nenhuma mensagem nova encontrada no momento.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredMessages.map(recipient => {
                                const { communication } = recipient;
                                const isUnread = !recipient.read_at;
                                const isActionRequired = (communication.metadata?.template === 'rsvp' || communication.metadata?.template === 'poll') && !recipient.response;

                                const dateObj = new Date(communication.created_at);
                                const displayDate = isToday(dateObj) ? 'Hoje' : format(dateObj, "dd/MM");

                                const channelColor = communication.channel?.color || 'blue';
                                const colorConfig = colorClasses[channelColor] || colorClasses.blue;

                                // Parse colors: "text-blue-500 bg-blue-50 text-blue-600"
                                // split[0] = text-500 (icon)
                                // split[1] = bg-50 (bg)
                                // split[2] = text-600 (label)
                                const colors = colorConfig.split(' ');

                                return (
                                    <Link
                                        key={recipient.id}
                                        href={`/comunicados/${recipient.communication_id}`}
                                        className={clsx(
                                            "block group relative p-3.5 mb-2 cursor-pointer transition-all active:scale-[0.98] rounded-2xl overflow-hidden",
                                            isUnread
                                                ? 'bg-white shadow-md shadow-slate-200/50 border border-slate-100'
                                                : 'bg-white border border-slate-100/50 hover:bg-slate-50'
                                        )}
                                    >
                                        {/* Status Indicator - BOTTOM RIGHT */}
                                        {isUnread ? (
                                            <div className="absolute bottom-0 right-0 p-3.5">
                                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)] animate-pulse" />
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-0 right-0 p-3.5">
                                                <MailOpen size={18} strokeWidth={2} className="text-slate-200" />
                                            </div>
                                        )}

                                        <div className="flex gap-4 items-start">
                                            {/* Icon Area */}
                                            <div className={clsx(
                                                "relative shrink-0 transition-transform duration-300 group-hover:scale-110 w-14 h-14 rounded-2xl flex items-center justify-center",
                                                colors[1], // bg-color-50
                                                colors[0]  // text-color-500 (usually used for icon stroke in legacy, checking match...)
                                                // Legacy code: `${colorConfig.split(' ')[1]} ${colorConfig.split(' ')[0]}`
                                                // [1] is bg, [0] is text-500. Correct.
                                            )}>
                                                {getIcon(communication.channel?.icon_name || 'MessageSquare', { size: 28, strokeWidth: 1.5, className: colors[0] })}

                                                {isActionRequired && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-lg flex items-center justify-center text-white shadow-sm animate-bounce-slow">
                                                        <Sparkles size={10} fill="white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex-1 min-w-0 flex flex-col pt-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx("text-[10px] font-bold uppercase tracking-widest", colors[2])}>
                                                            {communication.channel?.name || 'Geral'}
                                                        </span>

                                                        {/* Class Badge */}
                                                        {communication.target_type === 'CLASS' && recipient.student?.class_enrollments?.[0]?.class?.name && (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-bold uppercase tracking-widest border border-slate-200/50">
                                                                <Users size={8} />
                                                                {recipient.student.class_enrollments[0].class.name}
                                                            </div>
                                                        )}

                                                        {isActionRequired && (
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1">
                                                                <Flame size={10} strokeWidth={3} />
                                                                Ação Pendente
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                                        {displayDate}
                                                    </span>
                                                </div>

                                                <h3 className={clsx(
                                                    "text-base leading-snug mb-0.5 truncate pr-6",
                                                    isUnread ? 'font-bold text-slate-900' : 'font-bold text-slate-600'
                                                )}>
                                                    {communication.title}
                                                </h3>

                                                {/* Metadata Footer */}
                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                            {(Array.isArray(communication.sender_profile) ? communication.sender_profile[0]?.name : communication.sender_profile?.name) || 'Direção'}
                                                        </span>
                                                    </div>

                                                    {/* Actionable items */}
                                                    {(communication.metadata?.template === 'rsvp' || communication.metadata?.template === 'poll') && (
                                                        <div className={clsx("flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] border",
                                                            recipient.response
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                                        )}>
                                                            {communication.metadata.template === 'rsvp' ? <CalendarCheck size={10} /> : <BarChart2 size={10} />}
                                                            {communication.metadata.template === 'rsvp' ? (recipient.response ? 'Confirmado' : 'Responder RSVP') : (recipient.response ? 'Votado' : 'Votar Agora')}
                                                        </div>
                                                    )}

                                                    {communication.priority === 2 && (
                                                        <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg border border-rose-100 text-[9px] font-bold uppercase tracking-widest">
                                                            <Zap size={10} strokeWidth={3} className="fill-rose-600" />
                                                            Urgente
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
