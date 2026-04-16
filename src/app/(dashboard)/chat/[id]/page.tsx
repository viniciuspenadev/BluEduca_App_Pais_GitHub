'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Send, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    created_at: string;
}

export default function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { selectedStudent } = useStudent();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [threadInfo, setThreadInfo] = useState<any>(null);
    const [sendingImage, setSendingImage] = useState(false);

    const supabase = createClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial load
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
            fetchThreadInfo();
            fetchMessages();
            markAsRead();
        };

        init();

        // Subscriptions
        const channel = supabase
            .channel(`chat_${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `thread_id=eq.${id}`
            }, (payload) => {
                const newMsg = payload.new as any;

                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;

                    const isMine = newMsg.sender_id === userId;
                    const hydratedMsg = {
                        ...newMsg,
                        sender_name: isMine ? 'Você' : (newMsg.sender_name || '...')
                    };
                    return [...prev, hydratedMsg];
                });

                // Fetch sender name if not mine
                if (newMsg.sender_id !== userId) {
                    supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', newMsg.sender_id)
                        .single()
                        .then(({ data }) => {
                            if (data) {
                                setMessages(prev => prev.map(m =>
                                    m.id === newMsg.id ? { ...m, sender_name: data.name } : m
                                ));
                            }
                        });
                }

                markAsRead();
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchThreadInfo = async () => {
        const { data } = await supabase
            .from('chat_threads')
            .select('*')
            .eq('id', id)
            .single();
        if (data) setThreadInfo(data);
    };

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*, sender:profiles!sender_id(name)')
                .eq('thread_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const processed = (data || []).map((m: any) => ({
                ...m,
                sender_name: m.sender?.name
            }));

            setMessages(processed);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    const markAsRead = async () => {
        await supabase
            .from('chat_threads')
            .update({ unread_count_parent: 0 })
            .eq('id', id);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !userId) return;

        const content = newMessage.trim();
        const tempId = `temp-${Date.now()}`;

        // Optimistic UI update
        const optimisticMsg: ChatMessage = {
            id: tempId,
            sender_id: userId,
            sender_name: 'Você',
            content,
            type: 'text',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    thread_id: id,
                    sender_id: userId,
                    content,
                    type: 'text'
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setMessages(prev => prev.map(m =>
                    m.id === tempId ? { ...data, sender_name: 'Você' } : m
                ));
            }

            // CRITICAL: Increment school unread counter
            await supabase.rpc('increment_unread_school', { thread_id_param: id });

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem.');
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !userId) return;
        const file = e.target.files[0];

        setSendingImage(true);
        try {
            const filename = `chat_${id}_${Date.now()}_${file.name}`;
            const filePath = `chat/${id}/${filename}`;

            const { error: uploadError } = await supabase.storage
                .from('photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('photos')
                .getPublicUrl(filePath);

            const { error: msgError } = await supabase
                .from('chat_messages')
                .insert({
                    thread_id: id,
                    sender_id: userId,
                    content: publicUrl,
                    type: 'image'
                });

            if (msgError) throw msgError;

            await supabase.rpc('increment_unread_school', { thread_id_param: id });

        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            alert('Erro ao enviar a imagem. Tente novamente.');
        } finally {
            setSendingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getHeaderTitle = () => {
        if (!threadInfo) return 'Carregando...';
        if (threadInfo.channel_type === 'SECRETARIAT') return 'Secretaria';
        if (threadInfo.channel_type === 'FINANCE') return 'Financeiro';
        if (threadInfo.channel_type === 'CLASS') return `Professor da Turma`;
        return 'Atendimento';
    };

    const renderMessage = (msg: ChatMessage) => {
        const isMyMessage = msg.sender_id === userId;

        const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <div key={msg.id} className={`flex w-full mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${isMyMessage
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-slate-900 rounded-tl-sm'
                    }`}>
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                        <span className={`text-[11px] font-bold ${isMyMessage ? 'text-white/70' : 'text-slate-500'}`}>
                            {isMyMessage ? 'Você' : (msg.sender_name || 'Atendente')}
                        </span>
                    </div>

                    {msg.type === 'text' && (
                        <p className={`text-[15px] leading-snug whitespace-pre-wrap ${isMyMessage ? 'text-white' : 'text-slate-700'}`}>
                            {msg.content}
                        </p>
                    )}

                    {msg.type === 'image' && (
                        <div className="mt-1 rounded-lg overflow-hidden border border-black/10">
                            <img src={msg.content} alt="Imagem enviada" className="max-w-full h-auto max-h-64 object-contain" />
                        </div>
                    )}

                    <div className="flex justify-end mt-1">
                        <span className={`text-[10px] ${isMyMessage ? 'text-white/60' : 'text-slate-400'}`}>
                            {time}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[100dvh] max-w-2xl mx-auto bg-slate-50 relative">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 max-w-2xl mx-auto px-4 pb-6 pt-[max(2rem,env(safe-area-inset-top))] bg-white border-b border-slate-100 flex items-center gap-4 shrink-0 shadow-sm z-50 rounded-b-[1.5rem]">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">{getHeaderTitle()}</h1>
                    <p className="text-xs text-slate-500">{selectedStudent?.name}</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-[110px] pb-48 touch-pan-y">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-4">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-8 h-8 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">Nenhuma mensagem ainda.</p>
                                    <p className="text-sm text-slate-500 mt-1">Envie a primeira mensagem para iniciar o atendimento.</p>
                                </div>
                            </div>
                        )}
                        {messages.map(renderMessage)}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Form - Floating Pill */}
            <div 
                className="fixed left-0 right-0 w-full z-50 pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
            >
                <div className="max-w-2xl mx-auto px-4 pointer-events-auto">
                    <div className="flex items-center w-full bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-1.5 gap-2 transition-all">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImagePick}
                        />

                        {/* Image Button */}
                        <button
                            className="w-11 h-11 flex items-center justify-center bg-transparent rounded-full text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-50"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sendingImage}
                        >
                            {sendingImage ? (
                                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <ImageIcon className="w-[22px] h-[22px]" />
                            )}
                        </button>

                        {/* Text Input */}
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Mensagem..."
                            className="flex-1 min-w-0 h-11 bg-transparent outline-none px-1 text-[16px] placeholder:text-slate-400"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSend();
                            }}
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim()}
                            className="w-11 h-11 shrink-0 bg-brand-600 text-white rounded-full flex items-center justify-center disabled:opacity-0 disabled:scale-75 transition-all active:scale-95 shadow-sm"
                        >
                            <Send className="w-[18px] h-[18px] ml-[-2px] mt-[1px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
