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
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                <span>📊 Resumo - {periodLabel}</span>
                <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{totalReports} registros</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50/50 rounded-xl p-3 border border-green-100 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold text-green-700">{totalPresent}</span>
                    <span className="text-[10px] uppercase font-bold text-green-600/70 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Presenças
                    </span>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold text-blue-700">{totalHomework}</span>
                    <span className="text-[10px] uppercase font-bold text-blue-600/70 flex items-center gap-1">
                        <BookOpen size={10} /> Lições
                    </span>
                </div>
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold text-amber-700">{totalObservations}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-600/70 flex items-center gap-1">
                        <AlertCircle size={10} /> Obs.
                    </span>
                </div>
            </div>
        </div>
    );
};
