'use client';

import { useState } from 'react';
import { GraduationCap, ChevronDown, ChevronUp, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useGrades } from '@/hooks/useGrades';
import clsx from 'clsx';

const TERMS = [
    { id: '1_bimestre', label: '1º Bim' },
    { id: '2_bimestre', label: '2º Bim' },
    { id: '3_bimestre', label: '3º Bim' },
    { id: '4_bimestre', label: '4º Bim' },
];

export default function GradesPage() {
    const { data: subjects, isLoading } = useGrades();
    const [selectedTerm, setSelectedTerm] = useState('1_bimestre');
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

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

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Header Area */}
            <div className="p-6 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Boletim Escolar</h1>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Desempenho Acadêmico</p>
                    </div>
                </div>

                {/* Term Switcher - Segmented Control Style */}
                <div className="bg-gray-100 p-1 rounded-xl flex items-center justify-between shadow-inner max-w-md">
                    {TERMS.map((term) => (
                        <button
                            key={term.id}
                            onClick={() => setSelectedTerm(term.id)}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200",
                                selectedTerm === term.id
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {term.label.replace(' Bimestre', 'º Bm')}
                        </button>
                    ))}
                </div>
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
                            const termData = subject.terms[selectedTerm];
                            if (!termData) return null;

                            const isExpanded = expandedSubject === subject.name;
                            const scoreStyles = getScoreStyles(termData.totalScore);

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
                                            <div className={clsx(
                                                "w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl border-2 shadow-inner transition-colors",
                                                scoreStyles
                                            )}>
                                                {termData.totalScore.toFixed(1)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg leading-none uppercase tracking-tight">{subject.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Média do Período</p>
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
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                            {new Date(assessment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {assessment.grade !== undefined ? (
                                                            <div className={clsx(
                                                                "font-bold text-[13px] px-3 py-1.5 rounded-xl shadow-sm border transition-colors",
                                                                getAssessmentScoreStyles(assessment.grade, assessment.max_score)
                                                            )}>
                                                                {Number(assessment.grade).toFixed(1)}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                                                <AlertCircle size={10} /> Pendente
                                                            </div>
                                                        )}
                                                        <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-tighter italic">
                                                            Peso: {assessment.weight}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {subjects.every(s => !s.terms[selectedTerm]) && (
                            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Nenhuma avaliação registrada</p>
                                <p className="text-[10px] text-slate-400 mt-2">Escolha outro bimestre para conferir.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
