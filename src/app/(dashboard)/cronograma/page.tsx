'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { startOfWeek, addDays, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Clock, GraduationCap, BookOpen, Target, PenTool, CheckCircle2, Download } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function AgendaPage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    const [currentDate, setCurrentDate] = useState(() => {
        const date = new Date();
        const day = date.getDay();
        if (day === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
        if (day === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
        return date;
    });
    const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

    const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
        queryKey: ['enrollment', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return null;
            const supabase = createClient();
            const { data } = await supabase
                .from('class_enrollments')
                .select('class_id, class:classes!inner(name, school_year)')
                .eq('student_id', selectedStudent.id)
                .eq('class.status', 'active')
                .maybeSingle();
            return data;
        },
        enabled: !!selectedStudent
    });

    // Calculate Week Range
    const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    // If it was Sunday, startOfWeek gives Monday previous.
    // Let's stick to the logic: Monday of the current "view". 
    // The original app used custom logic:
    // const day = baseDate.getDay() || 7; 
    // if (day !== 1) start.setHours(-24 * (day - 1));
    // Implementation:
    const getWeekRange = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay() || 7; // 1 (Mon) to 7 (Sun)
        if (day !== 1) d.setHours(-24 * (day - 1));
        const start = startOfDay(d);
        const end = addDays(start, 4); // Mon to Fri
        return { start, end };
    };

    const { start, end } = getWeekRange(currentDate);

    const { data: plans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['plans', enrollment?.class_id, format(start, 'yyyy-MM-dd')],
        queryFn: async () => {
            if (!enrollment?.class_id) return [];
            const supabase = createClient();
            const { data, error } = await supabase
                .from('lesson_plans')
                .select(`
                    *,
                    subject:subjects(*),
                    teacher:profiles(name)
                `)
                .eq('class_id', enrollment.class_id)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'))
                .order('date')
                .order('start_time');

            if (error) throw error;
            return data;
        },
        enabled: !!enrollment?.class_id
    });

    const getPlansForDay = (dayIndex: number) => {
        // 1 = Monday
        const targetDate = addDays(start, dayIndex - 1);
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        return plans.filter((p: any) => p.date === dateStr);
    };

    const handlePreviousWeek = () => {
        setCurrentDate(prev => addDays(prev, -7));
    };

    const handleNextWeek = () => {
        setCurrentDate(prev => addDays(prev, 7));
    };

    if (studentLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
    if (!selectedStudent) return <div className="p-8 text-center text-gray-500">Selecione um aluno.</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24">

            {/* Header Area */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Atividades</h2>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <button onClick={handlePreviousWeek} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500 transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={handleNextWeek} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500 transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        {format(start, "d 'de' MMM", { locale: ptBR })} a {format(end, "d 'de' MMM", { locale: ptBR })}
                    </span>
                    {(enrollment?.class as any)?.name && (
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100 uppercase tracking-wider">
                            {(enrollment?.class as any).name}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            {enrollmentLoading || plansLoading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Carregando atividades...</p>
                </div>
            ) : !enrollment ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Sem turma associada</h2>
                    <p className="text-gray-500">O aluno ainda não foi enturmado.</p>
                </div>
            ) : (
                <div className="px-1 space-y-6">
                    {[1, 2, 3, 4, 5].map(dayIndex => {
                        const dayPlans = getPlansForDay(dayIndex);
                        const isToday = new Date().getDay() === dayIndex;

                        return (
                            <div key={dayIndex} className={`rounded-2xl border overflow-hidden ${isToday ? 'border-brand-300 shadow-md ring-1 ring-brand-100' : 'border-gray-200 bg-white shadow-sm'}`}>
                                <div className={`px-4 py-3 border-b flex justify-between items-center ${isToday ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <h3 className={`font-bold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                                        {WEEKDAYS[dayIndex]}
                                    </h3>
                                    {isToday && <span className="text-[10px] font-bold bg-brand-200 text-brand-800 px-2 py-0.5 rounded-full uppercase">Hoje</span>}
                                </div>

                                <div className="divide-y divide-gray-100 bg-white">
                                    {dayPlans.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400 text-sm italic">
                                            Nenhuma atividade planejada
                                        </div>
                                    ) : (
                                        dayPlans.map((plan: any) => (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan)}
                                                className="p-4 flex gap-4 hover:bg-gray-50 transition-colors group relative cursor-pointer"
                                            >
                                                {/* Time */}
                                                <div className="flex flex-col items-end min-w-[60px] pt-1">
                                                    <span className="text-lg font-bold text-gray-900 leading-none">{plan.start_time.slice(0, 5)}</span>
                                                    <span className="text-xs text-gray-400 mt-1 font-medium">{plan.end_time.slice(0, 5)}</span>
                                                </div>

                                                {/* Visual Line */}
                                                <div className="relative flex flex-col items-center">
                                                    <div className={`w-3 h-3 rounded-full border-2 mt-2 z-10 bg-white ${plan.status === 'cancelled' ? 'border-red-400' : 'border-brand-400 group-hover:bg-brand-400 group-hover:scale-125 transition-all'}`}></div>
                                                    <div className="w-px h-full bg-gray-100 absolute top-3 -z-0"></div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-4 flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        {/* Subject Pill */}
                                                        <span className={clsx(
                                                            "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold border shadow-sm",
                                                            plan.subject?.color || 'bg-gray-100 text-gray-700 border-gray-200'
                                                        )}>
                                                            {/* Assuming subject color contains bg-class, or we use style if it's hex. 
                                                                In original code it was class string. 
                                                                If hex, we need style. Let's assume class for now as per original.
                                                            */}
                                                            <span>{plan.subject?.emoji}</span>
                                                            {plan.subject?.name}
                                                        </span>

                                                        {/* Teacher Info */}
                                                        {plan.teacher?.name && (
                                                            <div className="flex items-center gap-1.5 pl-0.5 pt-1">
                                                                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                                                                <span className="text-xs font-medium text-gray-500">
                                                                    Prof. {plan.teacher.name}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Cancelled Badge */}
                                                        {plan.status === 'cancelled' && (
                                                            <div className="pt-1">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">
                                                                    Cancelada
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-400 transition-colors mt-1" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lesson Detail Drawer */}
            <BottomSheet
                isOpen={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
            >
                {selectedPlan && (
                    <div className="space-y-6 pb-8">
                        {/* Header Card */}
                        <div className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BookOpen className="w-24 h-24 text-brand-600" />
                            </div>

                            <div className="relative z-10 w-full">
                                <span className={clsx(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider mb-3 shadow-sm",
                                    "bg-white border-gray-200 text-gray-500"
                                )}>
                                    Acadêmico
                                </span>

                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                                    {selectedPlan.subject?.name}
                                </h2>

                                <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
                                    {(selectedPlan.start_time || selectedPlan.end_time) && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-brand-500" />
                                            <span>{selectedPlan.start_time.slice(0, 5)} {selectedPlan.end_time ? `- ${selectedPlan.end_time.slice(0, 5)}` : ''}</span>
                                        </div>
                                    )}
                                    {selectedPlan.teacher?.name && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-700">
                                                {selectedPlan.teacher.name.charAt(0)}
                                            </div>
                                            <span>Prof. {selectedPlan.teacher.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Sections */}
                        <div className="space-y-5">
                            {selectedPlan.topic && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Tópico da Atividade</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">{selectedPlan.topic}</p>
                                    </div>
                                </div>
                            )}

                            {selectedPlan.objective && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <Target className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Objetivos de Aprendizagem</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedPlan.objective}</p>
                                    </div>
                                </div>
                            )}

                            {selectedPlan.materials && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                            <PenTool className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Materiais Necessários</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedPlan.materials}</p>
                                    </div>
                                </div>
                            )}

                            {selectedPlan.homework && (
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <h3 className="text-sm font-bold text-amber-900">Lição de Casa</h3>
                                    </div>
                                    <p className="text-amber-800 text-sm font-medium pl-8">{selectedPlan.homework}</p>
                                </div>
                            )}

                            {/* Attachments (TODO: Check if schema has attachments, legacy mockup implies it) */}
                            {/* Assuming selectedPlan.attachments exists or is filtered from somewhere else */}
                        </div>
                    </div>
                )}
            </BottomSheet>
        </div>
    );
}
