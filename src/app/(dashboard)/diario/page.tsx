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
import { BookOpen, Utensils, Moon, Droplets, Smile, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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
        return <div className="p-8 text-center text-gray-500 uppercase text-xs font-bold tracking-widest">Selecione um aluno.</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24">

            {/* Header Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Diário de Classe</h1>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Acompanhe a rotina diária</p>
                    </div>
                </div>

                <div className="bg-gray-100 p-1 rounded-xl flex items-center justify-between shadow-inner">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${period === p
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary & Content */}
            <div className="px-1 space-y-4">
                <DiarySummary
                    periodLabel={getPeriodLabel()}
                    totalReports={reports.length}
                    totalPresent={totalPresent}
                    totalHomework={totalHomework}
                    totalObservations={totalObservations}
                />

                {isLoading ? (
                    <div className="space-y-4 animate-pulse pt-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 mt-4">
                        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium text-sm">Nenhum registro encontrado para {getPeriodLabel().toLowerCase()}.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => (
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

            {/* Detail Bottom Sheet */}
            <BottomSheet
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                title={selectedReport ? format(new Date(selectedReport.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR }) : ''}
            >
                {selectedReport && (
                    <div className="space-y-6 pb-8">

                        {/* Attendance & Teacher Header */}
                        <div className={`p-4 rounded-2xl flex items-center justify-between ${selectedReport.attendance_status === 'present' ? 'bg-green-50 border border-green-100 text-green-800' :
                            selectedReport.attendance_status === 'absent' ? 'bg-red-50 border border-red-100 text-red-800' :
                                'bg-blue-50 border border-blue-100 text-blue-800'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${selectedReport.attendance_status === 'present' ? 'bg-green-100 text-green-600' :
                                    selectedReport.attendance_status === 'absent' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    {selectedReport.attendance_status === 'present' ? <CheckCircle2 size={20} /> :
                                        selectedReport.attendance_status === 'absent' ? <AlertCircle size={20} /> : <FileText size={20} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[10px] uppercase tracking-[0.2em] leading-none opacity-40 mb-1.5">Frequência</span>
                                    <span className="font-bold text-xs">
                                        {selectedReport.attendance_status === 'present' ? 'PRESENTE' :
                                            selectedReport.attendance_status === 'absent' ? 'FALTOU' : 'JUSTIFICADO'}
                                    </span>
                                </div>
                            </div>

                            {selectedReport.teacher && (
                                <div className="text-right flex flex-col items-end">
                                    <span className="font-bold text-[10px] uppercase tracking-[0.2em] leading-none opacity-40 mb-1.5">Educador(a)</span>
                                    <span className="font-bold text-xs">{selectedReport.teacher.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Routine Grid */}
                        {selectedReport.routine_data && (
                            <div className="grid grid-cols-2 gap-3">
                                {selectedReport.routine_data.meals && (
                                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-2">
                                        <div className="flex items-center gap-2 text-orange-700 font-bold mb-1">
                                            <Utensils size={16} /> Alimentação
                                        </div>
                                        {selectedReport.routine_data.meals.breakfast && <p className="text-xs text-orange-900"><strong className="opacity-60">Café:</strong> {selectedReport.routine_data.meals.breakfast}</p>}
                                        {selectedReport.routine_data.meals.lunch && <p className="text-xs text-orange-900"><strong className="opacity-60">Almoço:</strong> {selectedReport.routine_data.meals.lunch}</p>}
                                        {selectedReport.routine_data.meals.snack && <p className="text-xs text-orange-900"><strong className="opacity-60">Lanche:</strong> {selectedReport.routine_data.meals.snack}</p>}
                                    </div>
                                )}
                                {selectedReport.routine_data.sleep && (
                                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2">
                                        <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1">
                                            <Moon size={16} /> Sono
                                        </div>
                                        {selectedReport.routine_data.sleep.nap && <p className="text-xs text-indigo-900">{selectedReport.routine_data.sleep.nap}</p>}
                                        {selectedReport.routine_data.sleep.duration && <p className="text-xs text-indigo-900">Duração: {selectedReport.routine_data.sleep.duration}</p>}
                                    </div>
                                )}
                                {selectedReport.routine_data.hygiene && (
                                    <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100 space-y-2">
                                        <div className="flex items-center gap-2 text-cyan-700 font-bold mb-1">
                                            <Droplets size={16} /> Higiene
                                        </div>
                                        {typeof selectedReport.routine_data.hygiene === 'string' ? (
                                            <p className="text-xs text-cyan-900">{selectedReport.routine_data.hygiene}</p>
                                        ) : (
                                            <>
                                                {selectedReport.routine_data.hygiene.status && <p className="text-xs text-cyan-900">{selectedReport.routine_data.hygiene.status}</p>}
                                                {selectedReport.routine_data.hygiene.diapers && <p className="text-xs text-cyan-900">Trocas: {selectedReport.routine_data.hygiene.diapers}</p>}
                                            </>
                                        )}
                                    </div>
                                )}
                                {selectedReport.routine_data.mood && (
                                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 space-y-2">
                                        <div className="flex items-center gap-2 text-yellow-700 font-bold mb-1">
                                            <Smile size={16} /> Humor
                                        </div>
                                        <p className="text-xs text-yellow-900">{selectedReport.routine_data.mood}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pedagogical Sections */}
                        <div className="space-y-4">
                            {selectedReport.homework && (
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <h3 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                                        <BookOpen size={16} /> Para Casa
                                    </h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.homework}</p>
                                </div>
                            )}
                            {selectedReport.activities && (
                                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                                    <h3 className="font-bold text-purple-800 text-sm mb-2 flex items-center gap-2">
                                        <FileText size={16} /> Atividades em Sala
                                    </h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.activities}</p>
                                </div>
                            )}
                            {selectedReport.observations && (
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                    <h3 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Observações
                                    </h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.observations}</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </BottomSheet>

        </div>
    );
}
