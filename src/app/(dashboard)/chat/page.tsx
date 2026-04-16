'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, MessageSquare, ChevronRight, Building, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';

interface ChatThread {
    id: string;
    student_id: string;
    last_message: string;
    last_message_at: string;
    last_sender_id: string;
    unread_count_parent?: number;
    channel_type: string;
    class_id: string | null;
}

export default function ChatIndexPage() {
    const router = useRouter();
    const { selectedStudent } = useStudent();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingChannel, setCreatingChannel] = useState<string | null>(null);
    const supabase = createClient();

    const fetchThreads = async () => {
        if (!selectedStudent) return;

        try {
            const { data, error } = await supabase
                .from('chat_threads')
                .select('*')
                .eq('student_id', selectedStudent.id);

            if (error) throw error;
            setThreads(data || []);
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThreads();

        // Realtime subscription for thread updates
        const channel = supabase
            .channel(`chat_threads_student_${selectedStudent?.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_threads',
                filter: `student_id=eq.${selectedStudent?.id}`
            }, () => {
                fetchThreads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedStudent?.id]);

    const handleChannelPress = async (channelType: string, classId: string | null) => {
        if (!selectedStudent) return;

        // Find existing thread
        const existingThread = threads.find(t =>
            t.channel_type === channelType &&
            (channelType === 'CLASS' ? t.class_id === classId : true)
        );

        if (existingThread) {
            router.push(`/chat/${existingThread.id}`);
            return;
        }

        // Create new thread
        setCreatingChannel(channelType);
        try {
            const { data, error } = await supabase
                .from('chat_threads')
                .insert({
                    school_id: selectedStudent.school_id,
                    student_id: selectedStudent.id,
                    channel_type: channelType,
                    class_id: channelType === 'CLASS' ? classId : null
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                router.push(`/chat/${data.id}`);
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            alert('Erro ao iniciar o chat. Tente novamente.');
        } finally {
            setCreatingChannel(null);
        }
    };

    const availableChannels = [
        {
            id: 'SECRETARIAT',
            title: 'Secretaria',
            desc: 'Dúvidas, documentos e requerimentos gerais',
            icon: Building
        },
        {
            id: 'FINANCE',
            title: 'Financeiro',
            desc: 'Boletos, mensalidades e acordos financeiros',
            icon: DollarSign
        }
    ];

    if (selectedStudent?.class_id) {
        availableChannels.unshift({
            id: 'CLASS',
            title: `Prof. da ${selectedStudent.class_name}`,
            desc: 'Dúvidas pedagógicas e rotina escolar',
            icon: Users
        });
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50 pb-24 max-w-2xl mx-auto relative pt-[110px]">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 max-w-2xl mx-auto px-4 pb-6 pt-[max(2rem,env(safe-area-inset-top))] bg-white border-b border-slate-100 flex items-center gap-4 z-50 shadow-sm rounded-b-[1.5rem]">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">Atendimento</h1>
                    <p className="text-xs text-slate-500">{selectedStudent?.name}</p>
                </div>
            </div>

            <div className="px-4 py-6">
                <p className="text-sm text-slate-500 mb-6 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
                    Escolha o departamento com o qual deseja falar sobre o aluno <span className="font-bold">{selectedStudent?.name.split(' ')[0]}</span>.
                </p>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {availableChannels.map((item) => {
                            const thread = threads.find(t =>
                                t.channel_type === item.id &&
                                (item.id === 'CLASS' ? t.class_id === selectedStudent?.class_id : true)
                            );

                            const time = thread?.last_message_at
                                ? new Date(thread.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : null;

                            const unreadCount = thread?.unread_count_parent || 0;
                            const hasUnread = unreadCount > 0;
                            const isCreating = creatingChannel === item.id;
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleChannelPress(item.id, selectedStudent?.class_id || null)}
                                    disabled={isCreating}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 text-left hover:bg-slate-50 transition-all active:scale-[0.98]"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center">
                                            <Icon className="w-6 h-6 text-brand-600" />
                                        </div>
                                        {hasUnread && (
                                            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-bold text-slate-900 truncate pr-2">{item.title}</h3>
                                            {time && <span className="text-xs text-slate-400 shrink-0">{time}</span>}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={`text-sm truncate pr-2 ${hasUnread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                                                {thread?.last_message || item.desc}
                                            </p>

                                            {isCreating ? (
                                                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                                            ) : hasUnread ? (
                                                <div className="bg-red-500 px-2 py-0.5 rounded-full shrink-0">
                                                    <span className="text-[10px] font-bold text-white">
                                                        {unreadCount}
                                                    </span>
                                                </div>
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
