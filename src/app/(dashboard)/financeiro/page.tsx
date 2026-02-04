'use client';

import { useQuery } from '@tanstack/react-query';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { InstallmentList, type Installment } from '@/components/finance/InstallmentList';
import { InstallmentDetail } from '@/components/finance/InstallmentDetail';
import { useState, useMemo } from 'react';
import { CreditCard, History, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const fetchFinancials = async (studentId: string, year: number) => {
    const supabase = createClient();

    // 1. Get Enrollment for this year
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('academic_year', year)
        .eq('status', 'approved')
        .maybeSingle();

    if (!enrollment) return [];

    // 2. Get Installments
    const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .eq('is_published', true)
        .order('due_date', { ascending: false });

    if (error) throw error;
    return data as Installment[];
};

export default function FinancePage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    const router = useRouter();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
    const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const queryClient = useQueryClient();
    const supabase = createClient();

    // Fetch Installments
    const { data: installments = [], isLoading, isError } = useQuery({
        queryKey: ['financials', selectedStudent?.id, selectedYear],
        queryFn: () => selectedStudent ? fetchFinancials(selectedStudent.id, selectedYear) : [],
        enabled: !!selectedStudent,
        placeholderData: (previousData) => previousData,
    });

    // Realtime Subscription
    useEffect(() => {
        // We need an enrollment_id to subscribe safely. 
        // We take it from the first installment if available, assuming all belong to the same enrollment context for this view.
        const enrollmentId = installments.length > 0 ? installments[0].enrollment_id : null;

        if (!enrollmentId) return;

        const channel = supabase.channel(`installments:${enrollmentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'installments',
                    filter: `enrollment_id=eq.${enrollmentId}`
                },
                (payload) => {
                    const newInstallment = payload.new as Installment;

                    // Optimistic Update
                    queryClient.setQueryData(['financials', selectedStudent?.id, selectedYear], (old: Installment[] = []) => {
                        return old.map(item =>
                            item.id === newInstallment.id ? { ...item, ...newInstallment } : item
                        );
                    });

                    // Trigger Success Feedback if status changed to paid
                    if (newInstallment.status === 'paid') {
                        setShowSuccess(true);
                        // Optional: Close details if open
                        if (selectedInstallment?.id === newInstallment.id) {
                            setSelectedInstallment(null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [installments, queryClient, selectedStudent?.id, selectedYear, supabase, selectedInstallment]);

    // Filter Logic
    const { openItems, historyItems } = useMemo(() => {
        const open: Installment[] = [];
        const history: Installment[] = [];

        installments.forEach(item => {
            if (item.status === 'pending' || item.status === 'overdue') {
                open.push(item);
            } else {
                history.push(item);
            }
        });

        // Sort: Open (Oldest due date first - debts first), History (Newest first)
        open.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        history.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

        return { openItems: open, historyItems: history };
    }, [installments]);

    const nextInstallment = useMemo(() => {
        if (!openItems.length) return null;
        return [...openItems].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    }, [openItems]);

    if (studentLoading) return (
        <div className="max-w-3xl mx-auto space-y-6 pt-4 px-4 overflow-hidden">
            <div className="h-8 w-40 bg-slate-100 rounded-lg animate-pulse mb-6" />
            <div className="h-32 bg-slate-50 rounded-3xl animate-pulse mb-8" />
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse"></div>)}
            </div>
        </div>
    );

    if (!selectedStudent) return <div className="p-8 text-center text-slate-500 font-medium">Selecione um aluno para ver o financeiro.</div>;

    return (
        <div className="max-w-3xl mx-auto pb-24 px-4">
            <div className="pt-4 space-y-8">
                {/* Header Standardized */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 active:scale-95 transition-all outline-none"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedStudent?.name}</p>
                        </div>
                    </div>

                    {/* Ano Selector - Soft Chips */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100">
                        {[2026, 2025, 2024].map(y => (
                            <button
                                key={y}
                                onClick={() => setSelectedYear(y)}
                                className={clsx(
                                    "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                    selectedYear === y
                                        ? "bg-brand-50 text-brand-600"
                                        : "text-slate-400 hover:text-slate-500"
                                )}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Light Summary Hero */}
                {!isLoading && openItems.length > 0 && nextInstallment && (
                    <div className="bg-brand-50 rounded-[28px] p-6 border border-brand-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <span className="text-brand-600/60 text-[10px] font-bold uppercase tracking-widest">Próximo Vencimento</span>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-3xl font-bold text-brand-700 tracking-tight">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nextInstallment.value)}
                                </h2>
                            </div>
                            <p className="text-xs font-medium text-brand-600/80">
                                Vence em {format(new Date(nextInstallment.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedInstallment(nextInstallment)}
                            className="bg-brand-600 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all text-center"
                        >
                            Pagar Agora
                        </button>
                    </div>
                )}

                {/* Tabs - iOS Style */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setActiveTab('open')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'open'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <CreditCard size={14} />
                        Aberto
                        <span className={clsx(
                            "ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold",
                            activeTab === 'open' ? "bg-slate-100 text-slate-600" : "bg-slate-200/50 text-slate-400"
                        )}>
                            {openItems.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'history'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <History size={14} />
                        Histórico
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[300px]">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl" />
                                        <div className="space-y-2">
                                            <div className="h-2 bg-slate-50 rounded-full w-20" />
                                            <div className="h-3 bg-slate-50 rounded-full w-32" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-20 bg-slate-50 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <InstallmentList
                            items={activeTab === 'open' ? openItems : historyItems}
                            onItemClick={setSelectedInstallment}
                            emptyMessage={activeTab === 'open' ? 'Nenhuma fatura pendente. Tudo em dia!' : 'Nenhum histórico de pagamentos.'}
                        />
                    )}
                </div>
            </div>

            {/* Detail Sheet */}
            <InstallmentDetail
                isOpen={!!selectedInstallment}
                onClose={() => setSelectedInstallment(null)}
                installment={selectedInstallment}
            />

            {/* Success Overlay - Instant Payment Feedback */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSuccess(false)}
                    >
                        <motion.div
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-xs w-full"
                        >
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                                <CheckCircle2 size={48} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Pagamento Confirmado!</h3>
                            <p className="text-slate-500 font-medium mb-6 leading-relaxed">
                                Recebemos a baixa do pagamento em tempo real. Tudo certo! 🚀
                            </p>
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Fechar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
