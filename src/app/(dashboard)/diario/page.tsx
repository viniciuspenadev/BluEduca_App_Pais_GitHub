'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { DiaryCard } from '@/components/diary/DiaryCard';
import { DiarySummary } from '@/components/diary/DiarySummary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAppSettings } from '@/hooks/useAppSettings';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpen, Utensils, Moon, Droplets, Smile, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

type PeriodType = 'today' | 'week' | 'month';

// Fetch Logic
const fetchDiary = async (studentId: string, period: PeriodType, academicYear?: number) => {
    const supabase = createClient();
    const now = new Date();
    let startDate: string, endDate: string;

    switch (period) {
        case 'today':
            startDate = format(now, 'yyyy-MM-dd');
            endDate = startDate;
            break;
        case 'week':
            startDate = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
            endDate = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
            break;
        case 'month':
            startDate = format(startOfMonth(now), 'yyyy-MM-dd');
            endDate = format(endOfMonth(now), 'yyyy-MM-dd');
            break;
    }

    // 1. Get Daily Reports
    const { data: reports, error } = await supabase
        .from('daily_reports')
        .select('*, teacher:profiles(name)')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (error) throw error;
    if (!reports || reports.length === 0) return [];

    // 2. Get Attributes (Attendance)
    const dates = reports.map(r => r.date);

    const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select(`
            status,
            sheet:class_attendance_sheets!inner(date)
        `)
        .eq('student_id', studentId)
        .in('sheet.date', dates);

    // Merge
    return reports.map(r => {
        const att = attendanceData?.find((a: any) => a.sheet?.date === r.date);
        return {
            ...r,
            attendance_status: att?.status // present, absent, late, justified
        };
    });
};

export default function DiaryPage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    const [period, setPeriod] = useState<PeriodType>('week');
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const { value: releaseTime } = useAppSettings('diary_release_time', '17:00');

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['diary', selectedStudent?.id, period],
        queryFn: () => selectedStudent ? fetchDiary(selectedStudent.id, period) : [],
        enabled: !!selectedStudent,
        placeholderData: (previousData) => previousData,
    });

    const getPeriodLabel = () => {
        switch (period) {
            case 'today': return 'Hoje';
            case 'week': return 'Esta Semana';
            case 'month': return 'Este Mês';
        }
    };

    // calculate stats
    const totalPresent = reports.filter(r => r.attendance_status === 'present').length;
    const totalHomework = reports.filter(r => r.homework).length;
    const totalObservations = reports.filter(r => r.observations).length;

    // Lock Logic
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const todayStr = format(now, 'yyyy-MM-dd');
    const isTodayLocked = currentTime < releaseTime;

    if (!selectedStudent) {
        if (studentLoading) {
            return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
        }
        return <div className="p-8 text-center text-slate-500 uppercase text-xs font-bold tracking-widest">Selecione um aluno.</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24">

            {/* Header Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Diário de Classe</h1>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Acompanhe a rotina diária</p>
                    </div>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center justify-between shadow-inner">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${period === p
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                        </button>
                    ))}
                </div>
            </div>
            {(() => {
                const filteredReports = reports.filter(r => {
                    const hasRoutine = r.routine_data && (
                        (r.routine_data.meals && Object.keys(r.routine_data.meals).length > 0) ||
                        (r.routine_data.sleep && Object.keys(r.routine_data.sleep).length > 0) ||
                        r.routine_data.mood ||
                        r.routine_data.hygiene
                    );
                    return hasRoutine || r.homework || r.activities || r.observations;
                });

                return (
                    <div className="px-1 space-y-4">
                        <DiarySummary
                            periodLabel={getPeriodLabel()}
                            totalReports={filteredReports.length}
                            totalPresent={totalPresent}
                            totalHomework={totalHomework}
                            totalObservations={totalObservations}
                        />

                        {isLoading ? (
                            <div className="space-y-4 animate-pulse pt-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>)}
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 mt-4">
                                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium text-sm">Nenhum registro com conteúdo encontrado para {getPeriodLabel().toLowerCase()}.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredReports.map((report) => (
                                    <DiaryCard
                                        key={report.id}
                                        report={report}
                                        onToggle={setSelectedReport}
                                        isLocked={report.date === todayStr && isTodayLocked}
                                        releaseTime={releaseTime}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Detail Bottom Sheet */}
            <BottomSheet
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                fullHeight={true}
                title={selectedReport && (
                    <div>
                        <p className="text-[10px] font-black uppercase text-brand-600 mb-1">Registro de Rotina</p>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">
                            {format(new Date(selectedReport.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Acompanhamento Diário</p>
                    </div>
                )}
                footer={
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-brand-200 active:scale-[0.98] transition-all"
                    >
                        Concluído
                    </button>
                }
            >
                {selectedReport && (
                    <div className="space-y-6">
                        {/* Attendance Status - More Subtle */}
                        <div className={clsx(
                            "p-4 rounded-2xl flex items-center justify-between border transition-colors",
                            selectedReport.attendance_status === 'present' ? 'bg-emerald-50/30 border-emerald-200/50 text-emerald-800' :
                                selectedReport.attendance_status === 'absent' ? 'bg-rose-50/30 border-rose-200/50 text-rose-800' :
                                    'bg-blue-50/30 border-blue-200/50 text-blue-800'
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                    selectedReport.attendance_status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                                        selectedReport.attendance_status === 'absent' ? 'bg-rose-100 text-rose-600' :
                                            'bg-blue-100 text-blue-600'
                                )}>
                                    {selectedReport.attendance_status === 'present' ? <CheckCircle2 size={20} /> :
                                        selectedReport.attendance_status === 'absent' ? <AlertCircle size={20} /> : <FileText size={20} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-xs uppercase tracking-widest opacity-60 mb-0.5">Status de Presença</span>
                                    <span className="font-bold text-base tracking-tight">
                                        {selectedReport.attendance_status === 'present' ? 'Presente na Unidade' :
                                            selectedReport.attendance_status === 'absent' ? 'Ausente' : 'Justificado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Routine Sections - Now Vertical and Spaced */}
                        {selectedReport.routine_data && (
                            <div className="space-y-4">
                                {/* Meals Section - Only if at least one meal exists */}
                                {(selectedReport.routine_data.meals?.breakfast || selectedReport.routine_data.meals?.lunch || selectedReport.routine_data.meals?.snack) && (
                                    <div className="p-5 bg-orange-50/40 rounded-2xl border border-orange-200/40 shadow-sm shadow-orange-100/10">
                                        <div className="flex items-center gap-2.5 text-orange-700 font-black text-xs uppercase tracking-widest mb-4">
                                            <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                                <Utensils size={14} />
                                            </div>
                                            Alimentação
                                        </div>
                                        <div className="space-y-3 pl-1">
                                            {selectedReport.routine_data.meals?.breakfast && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-orange-900/40 uppercase tracking-tighter">Café da Manhã</span>
                                                    <p className="text-base text-orange-900/80 font-bold">{selectedReport.routine_data.meals.breakfast}</p>
                                                </div>
                                            )}
                                            {selectedReport.routine_data.meals?.lunch && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-orange-900/40 uppercase tracking-tighter">Almoço</span>
                                                    <p className="text-base text-orange-900/80 font-bold">{selectedReport.routine_data.meals.lunch}</p>
                                                </div>
                                            )}
                                            {selectedReport.routine_data.meals?.snack && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-orange-900/40 uppercase tracking-tighter">Lanche</span>
                                                    <p className="text-base text-orange-900/80 font-bold">{selectedReport.routine_data.meals.snack}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Sleep & Mood Grid - Responsive Visibility */}
                                {(selectedReport.routine_data.sleep?.nap || selectedReport.routine_data.mood) && (
                                    <div className={clsx(
                                        "grid gap-4",
                                        (selectedReport.routine_data.sleep?.nap && selectedReport.routine_data.mood) ? "grid-cols-2" : "grid-cols-1"
                                    )}>
                                        {selectedReport.routine_data.sleep?.nap && (
                                            <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-200/40 shadow-sm shadow-indigo-100/10">
                                                <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-widest mb-3">
                                                    <Moon size={14} /> Sono
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-base text-indigo-900/80 font-bold leading-none">
                                                        {selectedReport.routine_data.sleep.nap}
                                                    </p>
                                                    {selectedReport.routine_data.sleep.duration && selectedReport.routine_data.sleep.duration !== '0' && (
                                                        <div className="flex items-center gap-1.5 text-indigo-900/60 font-bold text-base">
                                                            <Clock size={16} className="opacity-40" />
                                                            <span>Duração: {selectedReport.routine_data.sleep.duration}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {selectedReport.routine_data.mood && (
                                            <div className="p-5 bg-yellow-50/40 rounded-2xl border border-yellow-200/40 shadow-sm shadow-yellow-100/10">
                                                <div className="flex items-center gap-2 text-yellow-700 font-black text-xs uppercase tracking-widest mb-3">
                                                    <Smile size={14} /> Humor
                                                </div>
                                                <p className="text-base text-yellow-900/80 font-bold flex items-center gap-2">
                                                    <span className="text-xl leading-none">
                                                        {selectedReport.routine_data.mood === 'Feliz' && '😄'}
                                                        {selectedReport.routine_data.mood === 'Cansado' && '😴'}
                                                        {selectedReport.routine_data.mood === 'Choroso' && '😭'}
                                                        {selectedReport.routine_data.mood === 'Doente' && '🤒'}
                                                    </span>
                                                    {selectedReport.routine_data.mood}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hygiene Section - Condition check for string or object, treating "0" as empty */}
                                {selectedReport.routine_data.hygiene && (
                                    (typeof selectedReport.routine_data.hygiene === 'string' && selectedReport.routine_data.hygiene.length > 0 && selectedReport.routine_data.hygiene !== '0') ||
                                    (typeof selectedReport.routine_data.hygiene === 'object' && (
                                        (selectedReport.routine_data.hygiene.status && selectedReport.routine_data.hygiene.status !== '0') ||
                                        (selectedReport.routine_data.hygiene.diapers && selectedReport.routine_data.hygiene.diapers !== '0' && selectedReport.routine_data.hygiene.diapers !== 0)
                                    ))
                                ) && (
                                        <div className="p-5 bg-cyan-50/40 rounded-2xl border border-cyan-200/40 shadow-sm shadow-cyan-100/10">
                                            <div className="flex items-center gap-2.5 text-cyan-700 font-black text-xs uppercase tracking-widest mb-4">
                                                <div className="p-1.5 bg-cyan-100 rounded-lg text-cyan-600">
                                                    <Droplets size={14} />
                                                </div>
                                                Higiene
                                            </div>
                                            {typeof selectedReport.routine_data.hygiene === 'string' ? (
                                                <p className="text-base text-cyan-900/80 font-medium">{selectedReport.routine_data.hygiene}</p>
                                            ) : (
                                                <div className="space-y-4 pl-1">
                                                    {selectedReport.routine_data.hygiene.status && selectedReport.routine_data.hygiene.status !== '0' && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-cyan-900/40 uppercase tracking-widest">Estado</span>
                                                            <p className="text-base text-cyan-900/80 font-bold">{selectedReport.routine_data.hygiene.status}</p>
                                                        </div>
                                                    )}
                                                    {selectedReport.routine_data.hygiene.diapers && selectedReport.routine_data.hygiene.diapers !== '0' && selectedReport.routine_data.hygiene.diapers !== 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-cyan-900/40 uppercase tracking-widest">Trocas de Fralda</span>
                                                            <p className="text-base text-cyan-900/80 font-bold">{selectedReport.routine_data.hygiene.diapers}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* Pedagogical Sections - Premium Look */}
                        <div className="space-y-4">
                            {selectedReport.homework && (
                                <div className="bg-blue-50/30 p-5 rounded-2xl border-2 border-dashed border-blue-100/50">
                                    <h3 className="font-black text-blue-800 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <BookOpen size={14} /> Tarefa de Casa
                                    </h3>
                                    <p className="text-base text-slate-700 leading-relaxed font-medium bg-white/60 p-3 rounded-xl border border-blue-50/50 whitespace-pre-wrap">{selectedReport.homework}</p>
                                </div>
                            )}
                            {selectedReport.activities && (
                                <div className="bg-purple-50/30 p-5 rounded-2xl border-2 border-dashed border-purple-100/50">
                                    <h3 className="font-black text-purple-800 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <FileText size={14} /> Atividades em Sala
                                    </h3>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white/60 p-3 rounded-xl border border-purple-50/50 whitespace-pre-wrap">{selectedReport.activities}</p>
                                </div>
                            )}
                            {selectedReport.observations && (
                                <div className="bg-amber-50/30 p-5 rounded-2xl border-2 border-dashed border-amber-100/50">
                                    <h3 className="font-black text-amber-800 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200" /> Observações do Dia
                                    </h3>
                                    <p className="text-base text-slate-700 leading-relaxed font-medium bg-white/60 p-3 rounded-xl border border-amber-50/50 whitespace-pre-wrap">{selectedReport.observations}</p>
                                </div>
                            )}
                        </div>

                        {/* Audit Footer - Premium */}
                        <div className="pt-8 mt-4 border-t border-slate-50 flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 font-bold text-xs shadow-sm">
                                    {selectedReport.teacher?.name?.substring(0, 2).toUpperCase() || 'ED'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 leading-none uppercase tracking-[0.15em] mb-1.5 opacity-60">Registrado por:</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight">{selectedReport.teacher?.name || 'Educador(a)'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </BottomSheet>

        </div>
    );
}
