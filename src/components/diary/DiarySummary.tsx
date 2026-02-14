'use client';

import { CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';

interface DiarySummaryProps {
    periodLabel: string;
    totalReports: number;
    totalPresent: number;
    totalHomework: number;
    totalObservations: number;
}

export const DiarySummary = ({
    periodLabel,
    totalReports,
    totalPresent,
    totalHomework,
    totalObservations
}: DiarySummaryProps) => {

    if (totalReports === 0) return null;

    return (
        <div className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow-lg shadow-slate-200/50 rounded-2xl p-6 mb-8 mt-2 transition-all duration-500 hover:shadow-xl hover:shadow-brand-100/50">
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 leading-none mb-1">Estatísticas</span>
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">Resumo - {periodLabel}</h4>
                </div>
                <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-brand-100/50 shadow-sm">
                    {totalReports} registros
                </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100/40 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                    <span className="text-xl font-black text-emerald-600 leading-none mb-2">{totalPresent}</span>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-emerald-700/50 tracking-tight">
                        <CheckCircle2 size={12} className="opacity-60" /> Presenças
                    </div>
                </div>
                <div className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100/40 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                    <span className="text-xl font-black text-brand-600 leading-none mb-2">{totalHomework}</span>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-brand-700/50 tracking-tight">
                        <BookOpen size={12} className="opacity-60" /> Lições
                    </div>
                </div>
                <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100/40 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                    <span className="text-xl font-black text-amber-600 leading-none mb-2">{totalObservations}</span>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-amber-700/50 tracking-tight">
                        <AlertCircle size={12} className="opacity-60" /> Obs.
                    </div>
                </div>
            </div>
        </div>
    );
};
