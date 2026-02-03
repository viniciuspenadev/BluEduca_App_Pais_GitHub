'use client';

import { type FC, useState } from 'react';
import { Clock, Coffee, BookOpen, Moon, Bus, Circle, ChevronRight } from 'lucide-react';
import { useDailyTimeline, type DailyTimelineItem } from '@/hooks/useDailyTimeline';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CheckCircle2, Target, PenTool, Download } from 'lucide-react';
import clsx from 'clsx';

interface DailyTimelineProps {
    classId?: string;
    studentId?: string;
    enrollmentId?: string;
    externalItems?: DailyTimelineItem[]; // Allow passing lesson plans from parent
}

export const DailyTimeline: FC<DailyTimelineProps> = ({ classId, enrollmentId, externalItems = [] }) => {
    const { timeline, loading } = useDailyTimeline({ classId, enrollmentId });
    const [selectedItem, setSelectedItem] = useState<DailyTimelineItem | null>(null);

    // Merge logic
    const combinedItems = [...(timeline?.items || []), ...externalItems].sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
    });

    const itemsToDisplay = combinedItems.length > 0 ? combinedItems : [];

    const getIcon = (type: string) => {
        switch (type) {
            case 'food': return <Coffee className="w-4 h-4 text-orange-500" />;
            case 'academic': return <BookOpen className="w-4 h-4 text-brand-600" />;
            case 'rest': return <Moon className="w-4 h-4 text-purple-500" />;
            case 'transport': return <Bus className="w-4 h-4 text-blue-500" />;
            default: return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    if (loading) return <div className="p-4 text-center text-xs text-gray-400">Carregando rotina...</div>;
    if (itemsToDisplay.length === 0) return null;

    // Helper to get time in minutes for comparison
    const getTimeInMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const getCurrentStatus = (itemStartTime: string | null, nextItemStartTime: string | null) => {
        if (!itemStartTime) return 'future';

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = getTimeInMinutes(itemStartTime);

        // If there's a next item, check if we are in the window between this item and the next
        if (nextItemStartTime) {
            const endMinutes = getTimeInMinutes(nextItemStartTime);
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'current';
        } else {
            // Last item: current if started recently (e.g. within last hour)
            // Simple logic for MVP: Past if started > 1h ago, Current if start <= now <= start+1h
            // Wait, original logic was simpler:
            // if (currentMinutes >= startMinutes) return 'past';
            // But let's verify visual parity.
            // Original: 
            // if (nextItem) { if (now >= start && now < next) return 'current' }
            // else { if (now >= start) return 'current' } -- wait logic in original was:
            /*
               if (nextItemStartTime) {
                   if (curr >= start && curr < end) return 'current'
               } else {
                   if (curr >= start) return 'current' (meaning it is the active activity until end of day)
               }
               if (curr >= start) return 'past' (this line executes only if above returns didn't hit?? No.
               Original code had:
                if (next...) { ... return 'current' } else { if (curr >= start) return 'current' }
                
                If function didn't return yet:
                if (curr >= start) return 'past';
                
                Wait, if it returned 'current' in the 'else', then the 'past' check is unreachable.
                So effectively, for the last item, it's ALWAYS 'current' once started.
                For previous items, if we are PAST the window, they become... wait.
                If nextItem exists, and we are NOT in the window. 
                If curr < start -> Future.
                If curr >= end (of next item window means we are past THIS item) -> Past.
            */
            if (nextItemStartTime) {
                const endMinutes = getTimeInMinutes(nextItemStartTime);
                if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'current';
                if (currentMinutes >= endMinutes) return 'past';
            } else {
                if (currentMinutes >= startMinutes) return 'current';
            }
            if (currentMinutes >= startMinutes) return 'past'; // Fallback for intermediate items that are done
        }

        if (currentMinutes >= startMinutes) return 'past';
        return 'future';
    };

    return (
        <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 my-1">
                <div className="flex items-center gap-2 mb-3">
                    <div className="bg-brand-50 p-1.5 rounded-lg">
                        <Clock className="w-4 h-4 text-brand-600" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">Rotina do Dia</h3>
                </div>

                <div className="relative">
                    <div className="flex overflow-x-auto gap-0.5 pb-2 scrollbar-hide snap-x px-0 justify-between items-start">
                        {itemsToDisplay.map((item, index) => {
                            const isLast = index === itemsToDisplay.length - 1;
                            const nextItem = !isLast ? itemsToDisplay[index + 1] : null;

                            const status = getCurrentStatus(item.start_time || null, nextItem ? (nextItem.start_time || null) : null);

                            const isPast = status === 'past';
                            const isCurrent = status === 'current';
                            const isFuture = status === 'future';

                            const isClickable = item.type === 'academic' || !!item.description;
                            const hasTime = !!item.start_time;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => isClickable && setSelectedItem(item)}
                                    className={clsx(
                                        "relative flex-none md:flex-1 w-[52px] md:w-auto md:min-w-[52px] flex flex-col items-center group snap-start transition-opacity duration-300",
                                        isFuture ? 'opacity-50 grayscale' : 'opacity-100',
                                        isClickable ? 'cursor-pointer' : 'cursor-default'
                                    )}
                                >
                                    {/* Connector Line */}
                                    {!isLast && (
                                        <div className={clsx(
                                            "absolute top-[1.6rem] left-[50%] w-full h-[2px] -z-10 transition-colors duration-500",
                                            (isPast || isCurrent) ? 'bg-green-500' : 'bg-gray-100'
                                        )} />
                                    )}

                                    {/* Time Pill */}
                                    <span className={clsx(
                                        "text-[9px] font-bold mb-1 px-1 py-0.5 rounded-md transition-colors duration-300",
                                        isCurrent && 'bg-green-100 text-green-700 animate-pulse',
                                        isPast && 'bg-green-50 text-green-600',
                                        isFuture && 'bg-gray-100 text-gray-400',
                                        !hasTime && 'opacity-0'
                                    )}>
                                        {hasTime ? item.start_time?.slice(0, 5) : '--:--'}
                                    </span>

                                    {/* Icon Circle */}
                                    <div
                                        className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm border-2 transition-all transform duration-500",
                                            isCurrent ? 'border-green-500 shadow-green-200 scale-110 ring-2 ring-green-100' : 'border-white',
                                            isPast && 'bg-white border-green-500',
                                            isFuture && !item.color && 'bg-white border-gray-100'
                                        )}
                                        style={
                                            (isFuture && item.color) ? { backgroundColor: item.color + '15', color: item.color, borderColor: 'white' } : {}
                                        }
                                    >
                                        {getIcon(item.type)}
                                    </div>

                                    {/* Title */}
                                    <span className={clsx(
                                        "text-[9px] font-bold text-center leading-tight line-clamp-2 w-full px-0.5 transition-colors",
                                        isCurrent ? 'text-green-700' : 'text-gray-700',
                                        isFuture && 'text-gray-400'
                                    )}>
                                        {item.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Reuse Detail View (Inline BottomSheet) */}
            <BottomSheet
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
            >
                {selectedItem && (
                    <div className="space-y-6 pb-8">
                        {/* Wrapper to match DailyHighlights style roughly or LessonPlanDrawer */}
                        <div className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BookOpen className="w-24 h-24 text-brand-600" />
                            </div>

                            <div className="relative z-10 w-full">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 shadow-sm">
                                    {selectedItem.type === 'academic' ? 'Acadêmico' : 'Atividade'}
                                </span>

                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                                    {selectedItem.title}
                                </h2>

                                <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
                                    {(selectedItem.start_time || selectedItem.end_time) && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-brand-500" />
                                            <span>{selectedItem.start_time?.slice(0, 5)} {selectedItem.end_time ? `- ${selectedItem.end_time.slice(0, 5)}` : ''}</span>
                                        </div>
                                    )}
                                    {selectedItem.teacher_name && (
                                        <div className="flex items-center gap-1.5">
                                            {/* Avatar placeholder */}
                                            <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-700">
                                                {selectedItem.teacher_name.charAt(0)}
                                            </div>
                                            <span>Prof. {selectedItem.teacher_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {selectedItem.topic && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Tópico da Aula</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">{selectedItem.topic}</p>
                                    </div>
                                </div>
                            )}

                            {selectedItem.objective && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <Target className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Objetivos de Aprendizagem</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedItem.objective}</p>
                                    </div>
                                </div>
                            )}

                            {selectedItem.materials && (
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                            <PenTool className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Materiais Necessários</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedItem.materials}</p>
                                    </div>
                                </div>
                            )}

                            {selectedItem.homework && (
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <h3 className="text-sm font-bold text-amber-900">Lição de Casa</h3>
                                    </div>
                                    <p className="text-amber-800 text-sm font-medium pl-8">{selectedItem.homework}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </BottomSheet>
        </>
    );
};
