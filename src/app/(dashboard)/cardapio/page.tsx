'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { UtensilsCrossed, Loader2, ArrowLeft } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Meal {
    id: string;
    title: string;
    description: string;
    tags: string[];
}

interface MenuTemplate {
    id: string;
    name: string;
    content: Record<string, Meal[]>;
    is_active: boolean;
}

const WEEK_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const fetchActiveTemplate = async (schoolId?: string) => {
    if (!schoolId) return null;
    const supabase = createClient();
    const { data, error } = await supabase
        .from('menu_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

    if (error) throw error;

    // Migrate on the fly to support both old format (object) and new format (array of meals)
    if (data && data.content) {
        const newContent: Record<string, Meal[]> = {};
        Object.keys(data.content).forEach(day => {
            const dayData = data.content[day];
            if (Array.isArray(dayData)) {
                newContent[day] = dayData;
            } else if (typeof dayData === 'object' && dayData !== null) {
                newContent[day] = [{
                    id: Math.random().toString(36).substr(2, 9),
                    title: dayData.title || 'Almoço',
                    description: dayData.description || '',
                    tags: []
                }];
            } else {
                newContent[day] = [];
            }
        });
        data.content = newContent;
    }

    return data as MenuTemplate | null;
};

export default function LunchMenuPage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Fetch Template
    const { data: activeTemplate, isLoading } = useQuery({
        queryKey: ['menu_template', selectedStudent?.enrollment_id],
        queryFn: async () => {
            if (!selectedStudent?.enrollment_id) return null;
            const supabase = createClient();
            // Get school_id
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('school_id')
                .eq('id', selectedStudent.enrollment_id)
                .single();

            if (!enrollment?.school_id) return null;
            return fetchActiveTemplate(enrollment.school_id);
        },
        enabled: !!selectedStudent?.enrollment_id
    });

    const getDayMeals = (date: Date): Meal[] => {
        if (!activeTemplate?.content) return [];
        const dayIndex = getDay(date);
        const key = WEEK_KEYS[dayIndex];
        return activeTemplate.content[key] || [];
    };

    const currentMeals = getDayMeals(selectedDate);
    const hasAnyMenuForSelectedDay = currentMeals.length > 0;

    if (studentLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;

    return (
        <div className="space-y-8 pb-24 max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-brand-600 p-6 rounded-3xl shadow-lg shadow-brand-200">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white">Cardápio da Escola</h2>
                        <p className="text-xs text-white/70 font-medium">Refeições saudáveis para os alunos</p>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-black/10 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setWeekStart(addDays(weekStart, -7))}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    >
                        ←
                    </button>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar scrollbar-hide px-1">
                        {Array.from({ length: 7 }).map((_, idx) => {
                            const day = addDays(weekStart, idx);
                            const isSelected = isSameDay(day, selectedDate);
                            const dayMeals = getDayMeals(day);
                            const hasMenu = dayMeals.length > 0;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        flex flex-col items-center justify-center min-w-[3rem] h-12 rounded-lg shrink-0 transition-all
                                        ${isSelected
                                            ? 'bg-white text-brand-600 font-bold shadow-md'
                                            : 'text-white/60 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    <span className={`text-[9px] uppercase ${isSelected ? 'text-brand-600/60' : 'text-white/40'}`}>
                                        {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                                    </span>
                                    <span className="text-base leading-none mt-0.5">{format(day, 'dd')}</span>
                                    {hasMenu && (
                                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-brand-400' : 'bg-green-400'}`} />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <button
                        onClick={() => setWeekStart(addDays(weekStart, 7))}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    >
                        →
                    </button>
                </div>
            </div>

            <div className="px-1 max-w-2xl mx-auto space-y-6">
                <h2 className="text-gray-800 font-bold text-lg px-2 capitalize">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h2>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-brand-600 w-10 h-10 mb-4" />
                        <p className="text-gray-500 font-medium tracking-tight">Buscando cardápio...</p>
                    </div>
                ) : !activeTemplate ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                        <UtensilsCrossed size={48} className="text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Sem Cardápio Ativo</h3>
                        <p className="text-gray-500 text-sm">Nenhum cardápio foi publicado pela escola ainda.</p>
                    </div>
                ) : !hasAnyMenuForSelectedDay ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                        <UtensilsCrossed size={48} className="text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Nada cadastrado</h3>
                        <p className="text-gray-500 text-sm">Não há informações de refeições para este dia.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentMeals.map((meal) => (
                            <div key={meal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                                            <UtensilsCrossed size={24} />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-xl">{meal.title || 'Refeição do Dia'}</h3>
                                    </div>

                                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg font-medium p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                                        {meal.description || 'Nenhum detalhe informado.'}
                                    </div>

                                    {meal.tags && meal.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {meal.tags.map(tag => (
                                                <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                                                    <span>{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
