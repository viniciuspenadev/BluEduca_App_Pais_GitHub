'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Send, Smile, CalendarCheck, BarChart2, CheckCheck,
    Loader2, Users, MessageSquare, Zap, Clock, Info, Flame
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
    const inputRef = useRef<HTMLDivElement>(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isSubmittingWidget, setIsSubmittingWidget] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const handleWidgetResponse = async (option: string) => {
        if (!recipient) return;
        setIsSubmittingWidget(true);
        try {
            const responsePayload = {
                selected_option: option,
                answered_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('communication_recipients')
                .update({ response: responsePayload })
                .eq('communication_id', recipient.communication_id)
                .eq('guardian_id', recipient.guardian_id)
                .select();

            if (error) throw error;

            // Optimistic Update
            queryClient.setQueryData(['communication', id], (old: any) => ({
                ...old,
                response: responsePayload
            }));

        } catch (error) {
            console.error('Error saving response:', error);
            alert('Erro ao salvar resposta.');
        } finally {
            setIsSubmittingWidget(false);
        }
    };

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

    // Auto-scroll to bottom on load and new messages
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [replies]);

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
            if (inputRef.current) inputRef.current.innerText = '';
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
                    {/* Mensagem Original (Card) */}
                    {recipient && (
                        <>
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

                                    {/* Status Tags / Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {/* Urgent Badge */}
                                        {recipient.communication.priority === 2 && (
                                            <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg border border-rose-100 text-[10px] font-bold uppercase tracking-widest">
                                                <Zap size={12} strokeWidth={3} className="fill-rose-600" />
                                                Urgente
                                            </div>
                                        )}

                                        {/* Class Badge */}
                                        {recipient.communication.target_type === 'CLASS' && recipient.student?.class_enrollments?.[0]?.class?.name && (
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-200/50">
                                                <Users size={12} />
                                                {recipient.student.class_enrollments[0].class.name}
                                            </div>
                                        )}

                                        {/* Action Required / RSVP / Poll */}
                                        {(recipient.communication.metadata?.template === 'rsvp' || recipient.communication.metadata?.template === 'poll') && (
                                            <div className={clsx(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] border",
                                                recipient.response ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                            )}>
                                                {recipient.communication.metadata.template === 'rsvp' ? (
                                                    <CalendarCheck size={12} />
                                                ) : (
                                                    <BarChart2 size={12} />
                                                )}
                                                {recipient.communication.metadata.template === 'rsvp'
                                                    ? (recipient.response ? 'Confirmado' : 'Responder RSVP')
                                                    : (recipient.response ? 'Votado' : 'Votar Agora')
                                                }
                                            </div>
                                        )}

                                        {/* Generic Action Pending (if not covered above) */}
                                        {((recipient.communication.metadata?.template === 'rsvp' || recipient.communication.metadata?.template === 'poll') && !recipient.response) && (
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase tracking-widest">
                                                <Flame size={12} strokeWidth={2.5} />
                                                Ação Pendente
                                            </div>
                                        )}
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

                            {/* Interactive Widgets (RSVP & Polls) */}
                            {(recipient.communication.metadata?.template === 'rsvp' || recipient.communication.metadata?.template === 'poll') && (
                                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-10 h-10 flex items-center justify-center rounded-xl",
                                            recipient.communication.metadata.template === 'rsvp' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                        )}>
                                            {recipient.communication.metadata.template === 'rsvp' ? <CalendarCheck size={20} /> : <BarChart2 size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                                                {recipient.communication.metadata.template === 'rsvp' ? 'Confirmação de Presença' : 'Enquete / Votação'}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-medium">Sua resposta é importante</p>
                                        </div>
                                    </div>

                                    {/* Question for Poll */}
                                    {recipient.communication.metadata.template === 'poll' && recipient.communication.metadata.question && (
                                        <p className="text-sm font-bold text-gray-800">
                                            {recipient.communication.metadata.question}
                                        </p>
                                    )}

                                    {/* Interactive Buttons */}
                                    <div className="space-y-2 pt-2">
                                        {recipient.communication.metadata.template === 'rsvp' ? (
                                            <>
                                                {/* RSVP Options */}
                                                <button
                                                    onClick={() => handleWidgetResponse('Estarei Presente')}
                                                    disabled={!!recipient.response || isSubmittingWidget}
                                                    className={clsx(
                                                        "w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all font-bold text-sm",
                                                        recipient.response?.selected_option === 'Estarei Presente'
                                                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200" // Selected
                                                            : recipient.response
                                                                ? "bg-gray-50 text-gray-400 border border-gray-100 opacity-50" // Not selected but voted
                                                                : "bg-white border-2 border-slate-100 hover:border-emerald-500 hover:text-emerald-600 text-slate-600" // Default
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <CheckCheck size={16} /> Estarei Presente
                                                    </span>
                                                    {recipient.response?.selected_option === 'Estarei Presente' && <CheckCheck size={16} />}
                                                </button>

                                                <button
                                                    onClick={() => handleWidgetResponse('Não Poderei Comparecer')}
                                                    disabled={!!recipient.response || isSubmittingWidget}
                                                    className={clsx(
                                                        "w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all font-bold text-sm",
                                                        recipient.response?.selected_option === 'Não Poderei Comparecer'
                                                            ? "bg-rose-100 text-rose-700 border border-rose-200" // Selected
                                                            : recipient.response
                                                                ? "bg-gray-50 text-gray-400 border border-gray-100 opacity-50" // Not selected but voted
                                                                : "bg-white border-2 border-slate-100 hover:border-rose-500 hover:text-rose-600 text-slate-600" // Default
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Icons.XCircle size={16} /> Não Poderei Comparecer
                                                    </span>
                                                    {recipient.response?.selected_option === 'Não Poderei Comparecer' && <CheckCheck size={16} />}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Poll Options */}
                                                {recipient.communication.metadata.options?.map((option: string, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleWidgetResponse(option)}
                                                        disabled={!!recipient.response || isSubmittingWidget}
                                                        className={clsx(
                                                            "w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all font-bold text-sm",
                                                            recipient.response?.selected_option === option
                                                                ? "bg-purple-100 text-purple-700 border border-purple-200" // Selected
                                                                : recipient.response
                                                                    ? "bg-gray-50 text-gray-400 border border-gray-100 opacity-50" // Not selected but voted
                                                                    : "bg-white border-2 border-slate-100 hover:border-purple-500 hover:text-purple-600 text-slate-600" // Default
                                                        )}
                                                    >
                                                        <span>{option}</span>
                                                        {recipient.response?.selected_option === option && <CheckCheck size={16} />}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
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
                    <div className="flex-1 bg-gray-100 rounded-[26px] pl-2 pr-4 py-1 flex items-end gap-2 min-h-[44px]">
                        <button
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            className="w-10 h-10 flex items-center justify-center shrink-0 text-gray-400 active:text-blue-600 transition-colors mb-0.5"
                        >
                            <Smile size={24} strokeWidth={2} />
                        </button>

                        <div
                            ref={inputRef}
                            contentEditable
                            role="textbox"
                            aria-multiline="true"
                            className="flex-1 bg-transparent border-none focus:ring-0 active:ring-0 outline-none py-2.5 text-[15px] leading-relaxed font-medium text-gray-800 placeholder-gray-400 max-h-32 overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                            data-placeholder="Sua resposta..."
                            onInput={(e) => setReplyText(e.currentTarget.innerText)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (replyText.trim()) replyMutation.mutate(replyText);
                                }
                            }}
                            suppressContentEditableWarning={true}
                            inputMode="text"
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="sentences"
                        />
                    </div>

                    <button
                        onClick={() => replyMutation.mutate(replyText)}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className={clsx(
                            "w-11 h-11 flex items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:grayscale disabled:opacity-40 shadow-sm shrink-0",
                            theme.btn
                        )}
                    >
                        {replyMutation.isPending ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={18} strokeWidth={2.5} className="ml-0.5" />
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
                                onEmojiClick={(e) => {
                                    setReplyText(prev => prev + e.emoji);
                                    if (inputRef.current) inputRef.current.innerText += e.emoji;
                                }}
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
