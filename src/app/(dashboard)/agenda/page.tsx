'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, MapPin, Clock, History } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, isValid, isBefore, startOfDay, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStudent } from '@/contexts/StudentContext';
import clsx from 'clsx';

type EventType = 'academic' | 'holiday' | 'meeting' | 'other';
type FilterType = 'all' | EventType;

interface Event {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    type: EventType;
    location?: string;
    school_id: string;
}

const fetchEvents = async (schoolId?: string) => {
    if (!schoolId) return [];

    const supabase = createClient();
    const startHistory = subMonths(new Date(), 3).toISOString();

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_id', schoolId)
        .gte('start_time', startHistory)
        .order('start_time', { ascending: true })
        .limit(200);

    if (error) throw error;
    return data as Event[];
};

export default function AgendaPage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    // Assuming school_id is available on student or we need to fetch it? 
    // StudentContext doesn't explicitly expose school_id in the interface I updated, 
    // but usually it's derived from enrollment or user.
    // Let's check if I have school_id. 
    // In `ParentCalendar.tsx` (original), it used `useAuth().currentSchool`. 
    // `useStudent` might not have it. 
    // However, `enrollment` usually links to a class, which links to a school.
    // Ideally, the user (Parent) is linked to a school via `school_members` or the student enrollment.
    // For now, I will assume I can get it. 
    // Wait, the `fetchStudents` in `StudentContext` doesn't fetch `school_id`.
    // I should probably fetch the school_id if it's missing.
    // Or, I can fetch events by `enrollment_id` if logic permits. 
    // Original `ParentCalendar` used `school_id`.
    // Use `useStudent` context? Maybe I need to update context again or just fetch it here.
    // Actually, `selectedStudent` has `enrollment_id`. I can join to get school_id.
    // OR, I can temporarily fetch it inside the query.

    const [filter, setFilter] = useState<FilterType>('all');

    const { data: events = [], isLoading } = useQuery({
        queryKey: ['events', selectedStudent?.id], // Use student ID as key dependency
        queryFn: async () => {
            if (!selectedStudent?.school_id) return [];
            return fetchEvents(selectedStudent.school_id);
        },
        enabled: !!selectedStudent?.school_id,
        placeholderData: (previousData) => previousData,
    });

    const getEventBadgeStyle = (type: string, isPast: boolean) => {
        if (isPast) return 'bg-gray-100 text-gray-500';
        switch (type) {
            case 'academic': return 'bg-blue-100 text-blue-700';
            case 'holiday': return 'bg-red-100 text-red-700';
            case 'meeting': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'academic': return '📅 Acadêmico';
            case 'holiday': return '🎉 Feriado';
            case 'meeting': return '👥 Reunião';
            default: return '📌 Outro';
        }
    };

    const now = startOfDay(new Date());

    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true;
        return event.type === filter;
    });

    const futureEvents = filteredEvents
        .filter(e => !isBefore(new Date(e.start_time), now))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const pastEvents = filteredEvents
        .filter(e => isBefore(new Date(e.start_time), now))
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const renderEventCard = (event: Event, isPast: boolean) => {
        const dateObj = new Date(event.start_time);
        const dateStr = isValid(dateObj)
            ? format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR })
            : 'Data inválida';
        const timeStr = isValid(dateObj) ? format(dateObj, 'HH:mm') : '--:--';

        return (
            <div
                key={event.id}
                className={clsx(
                    "bg-white rounded-xl border shadow-sm overflow-hidden p-4 group transition-all",
                    isPast ? 'border-gray-100 grayscale hover:grayscale-0 opacity-70 hover:opacity-100' : 'border-gray-200 hover:shadow-md'
                )}
            >
                <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                    <h2 className={clsx("text-sm font-bold capitalize", isPast ? 'text-gray-400' : 'text-gray-700')}>
                        {dateStr}
                    </h2>
                    <span className={clsx("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", getEventBadgeStyle(event.type, isPast))}>
                        {getEventLabel(event.type).replace(/^[^\s]+\s/, '')}
                    </span>
                </div>

                <div className="space-y-2">
                    <h3 className={clsx("font-bold text-lg leading-tight", isPast ? 'text-gray-500' : 'text-gray-900')}>
                        {event.title}
                    </h3>

                    {event.description && (
                        <p className={clsx("text-sm line-clamp-2", isPast ? 'text-gray-400' : 'text-gray-600')}>
                            {event.description}
                        </p>
                    )}

                    <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-mono font-medium">{timeStr}</span>
                        </div>

                        {event.location && (
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate max-w-[150px]">{event.location}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!selectedStudent) {
        if (studentLoading) {
            return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
        }
        return <div className="p-8 text-center text-gray-500 uppercase text-xs font-bold tracking-widest">Selecione um aluno.</div>;
    }

    return (
        <div className="space-y-8 pb-12 max-w-2xl mx-auto">
            {/* Header & Filters */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Agenda Escolar</h2>
                        <p className="text-xs text-gray-400 font-medium">Fique por dentro de todos os eventos</p>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={clsx(
                            "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                            filter === 'all'
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 shadow-sm'
                        )}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('academic')}
                        className={clsx(
                            "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                            filter === 'academic'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 shadow-sm'
                        )}
                    >
                        📅 Acadêmico
                    </button>
                    <button
                        onClick={() => setFilter('meeting')}
                        className={clsx(
                            "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                            filter === 'meeting'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 shadow-sm'
                        )}
                    >
                        👥 Reuniões
                    </button>
                    <button
                        onClick={() => setFilter('holiday')}
                        className={clsx(
                            "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                            filter === 'holiday'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300 shadow-sm'
                        )}
                    >
                        🎉 Feriados
                    </button>
                </div>
            </div>

            {/* Content Actions */}
            <div className="px-1">
                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-5 bg-gray-100 rounded-full w-20"></div>
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center shadow-sm">
                        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {filter === 'all' ? 'Nenhum evento encontrado' : `Sem eventos de ${getEventLabel(filter).replace(/^[^\s]+\s/, '')}`}
                        </h3>
                        <p className="text-gray-500 text-sm max-w-[200px] mx-auto">
                            Não encontramos eventos para este filtro.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {futureEvents.length > 0 && (
                            <div className="space-y-4">
                                {pastEvents.length > 0 && (
                                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-1 font-bold">
                                        Próximos Eventos
                                    </h2>
                                )}
                                {futureEvents.map(event => renderEventCard(event, false))}
                            </div>
                        )}

                        {futureEvents.length === 0 && pastEvents.length > 0 && filter === 'all' && (
                            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                                <h3 className="text-gray-900 font-bold">Sem próximos eventos</h3>
                                <p className="text-gray-500 text-sm">Mas você pode ver o histórico abaixo.</p>
                            </div>
                        )}

                        {pastEvents.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <History className="w-4 h-4 text-gray-400" />
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                                        Histórico Recente
                                    </h2>
                                </div>
                                <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 space-y-4">
                                    {pastEvents.map(event => renderEventCard(event, true))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
