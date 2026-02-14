'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, ChevronDown, ChevronUp, FileText, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { useGrades } from '@/hooks/useGrades';
import clsx from 'clsx';

export default function GradesPage() {
    const { data, isLoading } = useGrades();
    const subjects = data?.subjects || [];
    const periods = data?.periods || [];

    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [descriptiveModal, setDescriptiveModal] = useState<{
        title: string;
        text: string;
        subject: string;
        author?: string;
        date?: string;
    } | null>(null);

    // Auto-select first period when data loads
    useEffect(() => {
        if (periods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(periods[0].id);
        }
    }, [periods, selectedPeriod]);

    const getScoreStyles = (score: number) => {
        if (score >= 6) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 4) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-rose-600 bg-rose-50 border-rose-100';
    };

    const getAssessmentScoreStyles = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio >= 0.6) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (ratio >= 0.4) return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-rose-50 text-rose-700 border-rose-100';
    };

    const getConceptStyles = (concept: string) => {
        switch (concept) {
            case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'C': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Header Area */}
            <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Boletim Escolar</h1>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Desempenho Acadêmico</p>
                    </div>
                </div>

                {/* Period Switcher - Dynamic from API */}
                {periods.length > 0 && (
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner overflow-x-auto no-scrollbar">
                        {periods.map((period) => (
                            <button
                                key={period.id}
                                onClick={() => setSelectedPeriod(period.id)}
                                className={clsx(
                                    "whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                                    selectedPeriod === period.id
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {period.period_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 px-4 pt-6 space-y-4 max-w-3xl mx-auto w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando notas...</p>
                    </div>
                ) : !subjects || subjects.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 uppercase tracking-tight">Sem notas ainda</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">As avaliações aparecerão aqui assim que os professores lançarem.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subjects.map((subject) => {
                            const termData = selectedPeriod ? subject.terms[selectedPeriod] : null;
                            if (!termData) return null;

                            const isExpanded = expandedSubject === subject.name;
                            const scoreStyles = getScoreStyles(termData.totalScore);

                            // Check if this subject has only descriptive/non-numeric assessments
                            const hasNumeric = termData.assessments.some(a => a.assessment_type === 'numeric');

                            return (
                                <div
                                    key={subject.name}
                                    className={clsx(
                                        "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                        isExpanded ? "border-brand-100 shadow-xl shadow-brand-50/50" : "border-slate-100 shadow-sm"
                                    )}
                                >
                                    <button
                                        onClick={() => setExpandedSubject(isExpanded ? null : subject.name)}
                                        className="w-full flex items-center justify-between p-5 text-left active:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-5">
                                            {hasNumeric ? (
                                                <div className={clsx(
                                                    "w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl border-2 shadow-inner transition-colors",
                                                    scoreStyles
                                                )}>
                                                    {termData.totalScore.toFixed(1)}
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-brand-50 text-brand-600 border-2 border-brand-100 shadow-inner">
                                                    <FileText className="w-7 h-7" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg leading-none uppercase tracking-tight">{subject.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                                    {hasNumeric ? 'Média do Período' : 'Avaliações de Acompanhamento'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                            isExpanded ? "bg-brand-50 text-brand-600 rotate-180" : "bg-slate-50 text-slate-300"
                                        )}>
                                            <ChevronDown size={20} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-5 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="h-px bg-slate-50 mb-3" />
                                            {termData.assessments.map((assessment) => (
                                                <div key={assessment.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group active:scale-98 transition-transform">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="text-[13px] font-bold text-slate-800 truncate uppercase tracking-tight">
                                                            {assessment.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {new Date(assessment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                            </p>
                                                            {assessment.assessment_type === 'descriptive' && (
                                                                <span className="text-[8px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-md font-bold uppercase tracking-tighter">Parecer</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {/* Render Numeric */}
                                                        {assessment.assessment_type === 'numeric' && assessment.grade !== undefined ? (
                                                            <div className={clsx(
                                                                "font-bold text-[13px] px-3 py-1.5 rounded-xl shadow-sm border transition-colors",
                                                                getAssessmentScoreStyles(assessment.grade, assessment.max_score)
                                                            )}>
                                                                {Number(assessment.grade).toFixed(1)}
                                                            </div>
                                                        ) : null}

                                                        {/* Render Concept */}
                                                        {assessment.assessment_type === 'concept' && assessment.grade_concept ? (
                                                            <div className={clsx(
                                                                "font-bold text-[13px] px-4 py-1.5 rounded-xl shadow-sm border transition-colors",
                                                                getConceptStyles(assessment.grade_concept)
                                                            )}>
                                                                {assessment.grade_concept}
                                                            </div>
                                                        ) : null}

                                                        {/* Render Descriptive Button */}
                                                        {assessment.assessment_type === 'descriptive' && assessment.grade_descriptive ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDescriptiveModal({
                                                                        title: assessment.title,
                                                                        text: assessment.grade_descriptive!,
                                                                        subject: subject.name,
                                                                        author: assessment.author_name,
                                                                        date: assessment.created_at
                                                                    });
                                                                }}
                                                                className="flex items-center gap-1.5 bg-white text-brand-600 border border-brand-100 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight shadow-sm active:bg-brand-50 transition-colors"
                                                            >
                                                                <MessageSquare size={12} /> Ver Parecer
                                                            </button>
                                                        ) : null}

                                                        {/* Empty State */}
                                                        {!assessment.grade && !assessment.grade_concept && !assessment.grade_descriptive && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                                                <AlertCircle size={10} /> Pendente
                                                            </div>
                                                        )}

                                                        <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-tighter italic">
                                                            {assessment.assessment_type === 'numeric' ? `Peso: ${assessment.weight}` : 'Avaliação Descritiva'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {selectedPeriod && subjects.every(s => !s.terms[selectedPeriod]) && (
                            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Nenhuma avaliação registrada</p>
                                <p className="text-[10px] text-slate-400 mt-2">Neste período as avaliações ainda não foram postadas.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Descriptive Bottom Sheet */}
            {descriptiveModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setDescriptiveModal(null)}
                    />

                    {/* Sheet Content */}
                    <div className="relative bg-white w-full max-w-2xl rounded-t-[32px] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-500 max-h-[90vh]">
                        {/* Drag Indicator */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                        <div className="px-8 pt-4 pb-6 border-b border-slate-50 flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 mb-1">Comentário Pedagógico</p>
                                <h3 className="text-xl font-bold text-slate-800 leading-tight">{descriptiveModal.title}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{descriptiveModal.subject}</p>
                            </div>
                            <button
                                onClick={() => setDescriptiveModal(null)}
                                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                            >
                                <ChevronDown className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-6">
                            <p className="text-slate-600 leading-relaxed text-base whitespace-pre-wrap font-medium pb-8 border-b border-slate-50">
                                {descriptiveModal.text}
                            </p>

                            {/* Author & Date Footer */}
                            <div className="mt-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 font-bold text-xs uppercase">
                                        {descriptiveModal.author?.substring(0, 2) || 'PR'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter mb-1">Registrado por</p>
                                        <p className="text-[13px] font-bold text-slate-700 leading-none">{descriptiveModal.author || 'Professor(a)'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter mb-1">Data do Registro</p>
                                    <p className="text-[13px] font-bold text-slate-700 leading-none">
                                        {descriptiveModal.date ? new Date(descriptiveModal.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-2 pb-10 px-8">
                            <button
                                onClick={() => setDescriptiveModal(null)}
                                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-brand-200 active:scale-[0.98] transition-all"
                            >
                                Entendi, obrigado!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
