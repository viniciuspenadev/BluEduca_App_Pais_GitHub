'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Send, Smile, CalendarCheck, BarChart2, CheckCheck,
    Loader2, Users, MessageSquare, Zap, Clock, Info
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface ReplyMessage {
    id: string;
    content: string;
    created_at: string;
    guardian_id: string;
    is_admin_reply?: boolean;
}

interface CommunicationDetail {
    id: string;
    communication_id: string;
    guardian_id: string;
    read_at: string | null;
    response?: any;
    communication: {
        id: string;
        title: string;
        content: string;
        created_at: string;
        priority: number;
        metadata?: any;
        target_type?: string;
        channel?: {
            name: string;
            color: string;
            icon_name?: string;
        };
        sender_profile?: {
            name: string;
        } | { name: string }[];
    };
    student?: {
        name: string;
        class_enrollments?: { class: { name: string } }[];
    }
}

export default function CommunicationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [replyText, setReplyText] = useState('');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [viewportHeight, setViewportHeight] = useState('100vh');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Viewport logic to handle mobile keyboard
    useEffect(() => {
        if (typeof window !== 'undefined' && window.visualViewport) {
            const handleResize = () => {
                const vh = window.innerHeight;
                const visualH = window.visualViewport?.height || vh;
                setViewportHeight(`${visualH}px`);
                setKeyboardHeight(vh - visualH);
            };
            window.visualViewport.addEventListener('resize', handleResize);
            handleResize();
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        }
    }, []);

    // Fetch Detail
    const { data: recipient, isLoading } = useQuery({
        queryKey: ['communication', id],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !id) return null;

            const { data, error } = await supabase
                .from('communication_recipients')
                .select(`
                    *,
                    communication:communications (
                        *,
                        channel:communication_channels (*),
                        sender_profile:profiles!sender_profile_id(name)
                    ),
                    student:students (
                        class_enrollments (
                            class:classes (name)
                        )
                    )
                `)
                .eq('communication_id', id)
                .eq('guardian_id', user.id)
                .single();

            if (error) throw error;
            return data as CommunicationDetail;
        },
        enabled: !!id
    });

    // Mark as Read
    useEffect(() => {
        if (recipient && !recipient.read_at) {
            const markRead = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from('communication_recipients')
                    .update({ read_at: new Date().toISOString() })
                    .eq('communication_id', recipient.communication_id)
                    .eq('guardian_id', user.id);

                queryClient.setQueriesData({ queryKey: ['communications'] }, (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.map((r: any) =>
                        r.communication_id === id ? { ...r, read_at: new Date().toISOString() } : r
                    );
                });
                queryClient.invalidateQueries({ queryKey: ['alerts'] });
            };
            markRead();
        }
    }, [recipient, queryClient, supabase, id]);

    // Replies
    const { data: replies = [] } = useQuery({
        queryKey: ['replies', id],
        queryFn: async () => {
            if (!id) return [];
            const { data } = await supabase
                .from('communication_replies')
                .select('*')
                .eq('communication_id', id)
                .order('created_at', { ascending: true });
            return data as ReplyMessage[] || [];
        },
        enabled: !!id,
        refetchInterval: 5000
    });

    // Realtime Chat Listener
    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`chat-room-${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'communication_replies',
                filter: `communication_id=eq.${id}`
            }, (payload) => {
                const newReply = payload.new as ReplyMessage;
                queryClient.setQueryData(['replies', id], (old: ReplyMessage[] = []) => {
                    if (old.find(r => r.id === newReply.id)) return old;
                    return [...old, newReply];
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, queryClient, supabase]);

    useEffect(() => {
        if (!isLoading) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [replies, isLoading]);

    // Mutation
    const replyMutation = useMutation({
        mutationFn: async (text: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !id) throw new Error("No user");
            const { data, error } = await supabase
                .from('communication_replies')
                .insert({ communication_id: id, guardian_id: user.id, content: text })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (newReply) => {
            setReplyText('');
            setIsEmojiPickerOpen(false);
            queryClient.setQueryData(['replies', id], (old: ReplyMessage[] = []) => [...old, newReply]);
        }
    });

    const handleBack = () => {
        setIsExiting(true);
        setTimeout(() => router.back(), 300);
    };

    // Color Theme Logic
    const channelColor = recipient?.communication?.channel?.color || 'blue';
    const colorSchemeBase: Record<string, any> = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', btn: 'bg-blue-600', shadow: 'shadow-blue-200/50', gradient: 'from-blue-600 to-blue-500', bgDot: 'bg-blue-600' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', btn: 'bg-indigo-600', shadow: 'shadow-indigo-200/50', gradient: 'from-indigo-600 to-indigo-500', bgDot: 'bg-indigo-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600', shadow: 'shadow-emerald-200/50', gradient: 'from-emerald-600 to-emerald-500', bgDot: 'bg-emerald-600' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600', shadow: 'shadow-emerald-200/50', gradient: 'from-emerald-600 to-emerald-500', bgDot: 'bg-emerald-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', btn: 'bg-orange-600', shadow: 'shadow-orange-200/50', gradient: 'from-orange-600 to-orange-500', bgDot: 'bg-orange-600' },
        red: { bg: 'bg-rose-50', text: 'text-rose-600', btn: 'bg-rose-600', shadow: 'shadow-rose-200/50', gradient: 'from-rose-600 to-rose-500', bgDot: 'bg-rose-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', btn: 'bg-purple-600', shadow: 'shadow-purple-200/50', gradient: 'from-purple-600 to-purple-500', bgDot: 'bg-purple-600' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', btn: 'bg-cyan-600', shadow: 'shadow-cyan-200/50', gradient: 'from-cyan-600 to-cyan-500', bgDot: 'bg-cyan-600' }
    };
    const theme = colorSchemeBase[channelColor] || colorSchemeBase.blue;

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={isExiting ? { x: '100%' } : { x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
            className="fixed inset-0 bg-white flex flex-col overflow-hidden z-[110] selection:bg-blue-100 overscroll-none"
            style={{ height: '100dvh', top: 0, left: 0, right: 0 }}
        >
            {/* Header Moderno & Imersivo */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 shrink-0 z-30 flex items-center gap-3">
                <button
                    onClick={handleBack}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-600 active:scale-90 transition-transform"
                >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold text-gray-900 truncate">
                        {isLoading ? <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" /> : recipient?.communication.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", isLoading ? "bg-gray-200" : theme.bgDot)} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {isLoading ? 'Carregando...' : (recipient?.communication.channel?.name || 'Informativo')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {recipient?.communication.priority === 2 && (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 animate-pulse">
                            <Zap size={16} fill="currentColor" />
                        </div>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto scroll-smooth overscroll-contain px-4 pb-6 space-y-8">
                <div className="max-w-2xl mx-auto space-y-10">

                    {isLoading ? (
                        /* Skeleton do Card Principal */
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
                    ) : recipient ? (
                        /* Card Principal */
                        <article className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/10">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("p-2 rounded-xl", theme.bg, theme.text)}>
                                        {(() => {
                                            const iconName = recipient.communication.channel?.icon_name || 'MessageSquare';
                                            const CapIcon = iconName.charAt(0).toUpperCase() + iconName.slice(1);
                                            const Icon = (Icons as any)[CapIcon] || Icons.MessageSquare;
                                            return <Icon size={18} strokeWidth={2.1} />;
                                        })()}
                                    </div>
                                    <span className={clsx("text-[10px] font-black uppercase tracking-[0.15em]", theme.text)}>
                                        {recipient.communication.channel?.name}
                                    </span>
                                </div>
                                <time className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                                    <Clock size={12} strokeWidth={2.5} />
                                    {format(new Date(recipient.communication.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                </time>
                            </div>

                            <div className="p-8">
                                <h2 className="text-2xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
                                    {recipient.communication.title}
                                </h2>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    {recipient.communication.target_type === 'CLASS' && recipient.student?.class_enrollments?.[0]?.class?.name && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-black uppercase tracking-wider">
                                            <Users size={12} strokeWidth={2.5} />
                                            <span>Turma {recipient.student.class_enrollments[0].class.name}</span>
                                        </div>
                                    )}
                                    {recipient.communication.priority === 2 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-wider">
                                            <Zap size={12} fill="currentColor" strokeWidth={2.5} />
                                            <span>URGENTE</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wider">
                                        <Info size={12} strokeWidth={2.5} />
                                        <span>Para {recipient.student?.name?.split(' ')[0] || 'Responsável'}</span>
                                    </div>
                                </div>

                                <div
                                    className="prose prose-slate max-w-none text-gray-700 font-medium leading-[1.8] text-[15px]"
                                    dangerouslySetInnerHTML={{ __html: recipient.communication.content }}
                                />
                            </div>

                            <div className="px-8 py-5 border-t border-gray-50 bg-gray-50/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-gray-400 shadow-sm text-xs">
                                        {(Array.isArray(recipient.communication.sender_profile) ? recipient.communication.sender_profile[0]?.name : recipient.communication.sender_profile?.name)?.charAt(0) || 'E'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">
                                            {(Array.isArray(recipient.communication.sender_profile) ? recipient.communication.sender_profile[0]?.name : recipient.communication.sender_profile?.name) || 'Escola'}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">Emissor oficial</p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ) : null}

                    {/* Chat History */}
                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="flex justify-end"><div className="h-12 w-48 bg-blue-50/50 rounded-[28px] animate-pulse" /></div>
                            <div className="flex justify-start"><div className="h-12 w-48 bg-gray-50 rounded-[28px] animate-pulse" /></div>
                        </div>
                    ) : replies.length > 0 && (
                        <div className="space-y-6 pt-4 pb-12">
                            <div className="flex items-center gap-4 opacity-40">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Atendimento</span>
                                <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            <div className="space-y-4">
                                {replies.map(reply => {
                                    const isMe = !reply.is_admin_reply;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={reply.id}
                                            className={clsx("flex flex-col", isMe ? "items-end pl-12" : "items-start pr-12")}
                                        >
                                            <div className={clsx(
                                                "px-5 py-3.5 rounded-[28px] text-[14px] leading-relaxed shadow-sm",
                                                isMe
                                                    ? `bg-blue-600 text-white rounded-tr-lg ${theme.shadow}`
                                                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-lg"
                                            )}>
                                                <p className="font-semibold">{reply.content}</p>
                                                <div className={clsx(
                                                    "flex items-center gap-1 mt-1.5 text-[9px] font-bold",
                                                    isMe ? "text-white/60 justify-end" : "text-gray-400"
                                                )}>
                                                    {format(new Date(reply.created_at), "HH:mm")}
                                                    {isMe && <CheckCheck size={12} strokeWidth={2.5} />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} className="h-24" />
                </div>
            </main>

            {/* Input Floating Bar */}
            <div
                className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-[120]"
                style={{
                    paddingBottom: keyboardHeight > 0 ? '12px' : 'calc(env(safe-area-inset-bottom) + 12px)',
                    transform: `translateY(-${keyboardHeight}px)`
                }}
            >
                <div className="max-w-2xl mx-auto w-full pointer-events-auto">

                    <AnimatePresence>
                        {isEmojiPickerOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="mb-4"
                            >
                                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                                    <EmojiPicker
                                        onEmojiClick={(e) => setReplyText(prev => prev + e.emoji)}
                                        width="100%"
                                        height={300}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-2 pr-2.5 pl-3 border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.12)] flex items-end gap-2 group focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <button
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            className={clsx(
                                "p-3 rounded-2xl transition-all active:scale-90",
                                isEmojiPickerOpen ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"
                            )}
                        >
                            <Smile size={24} strokeWidth={2.5} />
                        </button>

                        <div className="flex-1 min-h-[48px] flex items-center py-2">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Sua resposta..."
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm text-gray-800 placeholder-gray-400 font-bold py-1 px-1"
                                rows={1}
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="sentences"
                            />
                        </div>

                        <div className="shrink-0">
                            <button
                                onClick={() => replyMutation.mutate(replyText)}
                                disabled={isLoading || replyMutation.isPending || !replyText.trim()}
                                className={clsx(
                                    "w-12 h-12 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale",
                                    theme.gradient,
                                    theme.shadow
                                )}
                            >
                                {replyMutation.isPending ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Send size={20} className="ml-0.5" strokeWidth={3} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
