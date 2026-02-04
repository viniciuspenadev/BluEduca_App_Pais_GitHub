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

    // Viewport logic and body scroll lock
    useEffect(() => {
        // Lock body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, []);
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

    // Replies (Messages)
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
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    });

    const handleBack = () => {
        setIsExiting(true);
        setTimeout(() => router.back(), 300);
    };

    // Color Theme Logic
    const channelColor = recipient?.communication?.channel?.color || 'blue';
    const colorSchemeBase: Record<string, any> = {
        blue: { bgDot: 'bg-blue-600', accent: 'text-blue-600', btn: 'bg-blue-600 ring-4 ring-blue-600/10' },
        green: { bgDot: 'bg-emerald-600', accent: 'text-emerald-600', btn: 'bg-emerald-600 ring-4 ring-emerald-600/10' },
        orange: { bgDot: 'bg-orange-600', accent: 'text-orange-600', btn: 'bg-orange-600 ring-4 ring-orange-600/10' },
        red: { bgDot: 'bg-rose-600', accent: 'text-rose-600', btn: 'bg-rose-600 ring-4 ring-rose-600/10' },
        purple: { bgDot: 'bg-purple-600', accent: 'text-purple-600', btn: 'bg-purple-600 ring-4 ring-purple-600/10' }
    };
    const theme = colorSchemeBase[channelColor] || colorSchemeBase.blue;

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={isExiting ? { x: '100%' } : { x: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-white z-[200] flex flex-col overflow-hidden overscroll-none"
            style={{ height: '100dvh' }}
        >
            {/* Header Padronizado */}
            <header className="shrink-0 h-16 bg-white border-b border-gray-100 px-4 flex items-center justify-between gap-3 z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-900" strokeWidth={2.5} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">
                            {isLoading ? '...' : recipient?.communication.title}
                        </h1>
                        <div className="flex items-center gap-1.5 leading-none">
                            <div className={clsx("w-1.5 h-1.5 rounded-full", theme.bgDot)} />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {isLoading ? 'CARREGANDO' : (recipient?.communication.channel?.name || 'MENSAGEM')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {recipient?.communication.priority === 2 && (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500">
                            <Zap size={16} fill="currentColor" />
                        </div>
                    )}
                </div>
            </header>

            {/* Chat Content */}
            <main className="flex-1 overflow-y-auto bg-[#F2F2F7] px-4 py-6 space-y-6">
                <div className="max-w-xl mx-auto space-y-8">
                    {/* Mensagem Original (Card) */}
                    {recipient && (
                        <article className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs font-black text-gray-400">
                                            {(Array.isArray(recipient.communication.sender_profile) ? recipient.communication.sender_profile[0]?.name : recipient.communication.sender_profile?.name)?.charAt(0) || 'E'}
                                        </div>
                                        <span className="text-xs font-bold text-gray-900">
                                            {(Array.isArray(recipient.communication.sender_profile) ? recipient.communication.sender_profile[0]?.name : recipient.communication.sender_profile?.name) || 'Escola'}
                                        </span>
                                    </div>
                                    <time className="text-[10px] font-bold text-gray-400 uppercase">
                                        {format(new Date(recipient.communication.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                    </time>
                                </div>
                                <h2 className="text-xl font-black text-gray-900 mb-4 leading-tight">
                                    {recipient.communication.title}
                                </h2>
                                <div
                                    className="prose prose-slate max-w-none text-gray-700 text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: recipient.communication.content }}
                                />
                            </div>
                        </article>
                    )}

                    {/* Respostas / Histórico */}
                    <div className="space-y-4">
                        {replies.map((reply) => {
                            const isMe = !reply.is_admin_reply;
                            return (
                                <div key={reply.id} className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}>
                                    <div className={clsx(
                                        "max-w-[85%] px-4 py-2.5 rounded-[18px] text-sm shadow-sm",
                                        isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                                    )}>
                                        <p className="font-medium whitespace-pre-wrap">{reply.content}</p>
                                        <div className={clsx(
                                            "flex items-center gap-1 mt-1 text-[9px] font-bold opacity-70",
                                            isMe ? "justify-end text-blue-50" : "text-gray-400"
                                        )}>
                                            {format(new Date(reply.created_at), "HH:mm")}
                                            {isMe && <CheckCheck size={12} strokeWidth={2.5} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} className="h-4" />
                    </div>
                </div>
            </main>

            {/* Input WhatsApp Style */}
            <div className="shrink-0 bg-white border-t border-gray-100 p-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
                <div className="max-w-xl mx-auto flex items-end gap-2">
                    <div className="flex-1 bg-gray-100 rounded-[24px] px-3 py-1 flex items-end gap-2">
                        <button
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            className="w-10 h-10 flex items-center justify-center shrink-0 text-gray-400 active:text-blue-600 transition-colors"
                        >
                            <Smile size={24} strokeWidth={2} />
                        </button>

                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Sua resposta..."
                            className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-[15px] font-medium text-gray-800 placeholder-gray-400 resize-none max-h-32"
                            rows={1}
                            autoCorrect="off"
                            autoComplete="off"
                            spellCheck={false}
                            enterKeyHint="send"
                        />
                    </div>

                    <button
                        onClick={() => replyMutation.mutate(replyText)}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className={clsx(
                            "w-11 h-11 flex items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:grayscale disabled:opacity-40",
                            theme.btn
                        )}
                    >
                        {replyMutation.isPending ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} className="translate-x-0.5" strokeWidth={3} />
                        )}
                    </button>
                </div>

                {/* Emoji Picker Portal Logic (Mobile Optimized) */}
                <AnimatePresence>
                    {isEmojiPickerOpen && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 320 }}
                            exit={{ height: 0 }}
                            className="overflow-hidden bg-white mt-2"
                        >
                            <EmojiPicker
                                onEmojiClick={(e) => setReplyText(prev => prev + e.emoji)}
                                width="100%"
                                height={320}
                                lazyLoadEmojis={true}
                                previewConfig={{ showPreview: false }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
