'use client';

import { type FC, memo } from 'react';
import { ChevronRight, Utensils, Moon, Smile, Droplets, Book, Lock } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

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
        if (isLocked) return `Disponível às ${releaseTime}h hoje`;
        return 'Toque para ver os detalhes do dia';
    };

    const StatusIcon = ({ status }: { status?: string }) => {
        if (!status) return null;
        return (
            <div className={clsx(
                "w-2 h-2 rounded-full ring-4 transition-all duration-500",
                status === 'present' ? 'bg-emerald-500 ring-emerald-500/10' :
                    status === 'absent' ? 'bg-rose-500 ring-rose-500/10' :
                        status === 'late' ? 'bg-amber-500 ring-amber-500/10' :
                            'bg-blue-500 ring-blue-500/10'
            )} />
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: isLocked ? 1 : 1.01 }}
            whileTap={{ scale: isLocked ? 1 : 0.98 }}
            onClick={() => !isLocked && onToggle(report)}
            className={clsx(
                "group relative bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-5 cursor-pointer overflow-hidden",
                "transition-all duration-300 hover:shadow-xl hover:shadow-brand-100/40 hover:border-brand-100",
                isLocked && "opacity-80 bg-slate-50 border-slate-200 cursor-not-allowed"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                        {!isLocked && <StatusIcon status={report.attendance_status} />}
                        {isLocked && <Lock size={12} className="text-slate-400" />}
                        <h2 className={clsx(
                            "text-sm font-black tracking-tight leading-none capitalize",
                            isLocked ? "text-slate-400" : "text-slate-800"
                        )}>
                            {dateStr}
                        </h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className={clsx(
                            "text-xs font-bold truncate flex-1 leading-snug tracking-tight",
                            isLocked ? 'text-slate-400 font-medium' : 'text-slate-600'
                        )}>
                            {getCardSummary(report)}
                        </p>
                    </div>

                    {/* Repetitive indicators removed per user request */}
                </div>

                <div className={clsx(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                    isLocked ? "bg-slate-200/50 text-slate-400" : "bg-slate-50 text-slate-400 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-200"
                )}>
                    <ChevronRight size={20} className={clsx("transition-transform", !isLocked && "group-hover:translate-x-0.5")} />
                </div>
            </div>

            {/* Subtle Gradient Overlay for Premium Feel */}
            {!isLocked && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/5 to-transparent rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            )}
        </motion.div>
    );
});

