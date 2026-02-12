'use client';

import { type FC, memo } from 'react';
import { ChevronRight, Utensils, Moon, Smile, Droplets, Book } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiaryCardProps {
    report: any;
    onToggle: (report: any) => void;
    isLocked?: boolean;
    releaseTime?: string;
}

export const DiaryCard: FC<DiaryCardProps> = memo(({ report, onToggle, isLocked = false, releaseTime = '17:00' }) => {
    const reportDate = new Date(report.date + 'T12:00:00'); // Use noon to avoid timezone shift
    const dateStr = isValid(reportDate)
        ? format(reportDate, "EEEE, d 'de' MMMM", { locale: ptBR })
        : 'Data inválida';

    const getCardSummary = (r: any) => {
        if (isLocked) return `🔒 Disponível após as ${releaseTime}h`;

        // Prioritize Routine highlights
        const highlights = [];
        if (r.routine_data?.meals?.lunch) highlights.push(r.routine_data.meals.lunch);
        if (r.routine_data?.sleep?.nap) highlights.push(r.routine_data.sleep.nap);
        if (r.routine_data?.mood) highlights.push(r.routine_data.mood);

        if (highlights.length > 0) return highlights.join(' • ');

        // Fallback to text fields
        if (r.homework) return `📚 ${r.homework.split('\n')[0]}`;
        if (r.activities) return `🎨 ${r.activities.split('\n')[0]}`;
        if (r.observations) return `📝 ${r.observations.split('\n')[0]}`;

        return 'Toque para ver os detalhes';
    };

    const StatusIcon = ({ status }: { status?: string }) => {
        if (!status) return null;
        if (status === 'present') return <span className="w-2 h-2 rounded-full bg-green-500 block" title="Presente" />;
        if (status === 'absent') return <span className="w-2 h-2 rounded-full bg-red-500 block" title="Falta" />;
        if (status === 'late') return <span className="w-2 h-2 rounded-full bg-orange-500 block" title="Atraso" />;
        return <span className="w-2 h-2 rounded-full bg-blue-500 block" title="Justificado" />;
    };

    return (
        <div
            onClick={() => !isLocked && onToggle(report)}
            className={`
                group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer 
                transition-all hover:shadow-md hover:border-brand-200 active:scale-[0.98]
                ${isLocked ? 'opacity-75 bg-gray-50 grayscale' : ''}
            `}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <StatusIcon status={report.attendance_status} />
                        <h2 className="text-sm font-bold text-gray-800 capitalize truncate">
                            {dateStr}
                        </h2>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                        <p className={`text-xs font-medium truncate flex-1 pr-2 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                            {getCardSummary(report)}
                        </p>
                    </div>

                    {/* Mini Icons for quick status */}
                    {!isLocked && (
                        <div className="flex gap-2 mt-2">
                            {report.routine_data?.meals && <Utensils size={14} className="text-orange-400" />}
                            {report.routine_data?.sleep && <Moon size={14} className="text-indigo-400" />}
                            {report.routine_data?.mood && <Smile size={14} className="text-yellow-400" />}
                            {(report.homework || report.activities) && <Book size={14} className="text-blue-400" />}
                        </div>
                    )}
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
});
