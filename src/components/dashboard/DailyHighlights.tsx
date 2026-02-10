'use client';

import { Baby, Utensils, Moon, Smile, CheckCircle2 } from 'lucide-react';

interface DailyHighlightsProps {
    highlights: {
        hasData: boolean;
        food: string;
        sleep: string;
        mood: string;
        bathroom: string;
    };
    locked?: boolean;
}

export const DailyHighlights = ({ highlights, locked }: DailyHighlightsProps) => {
    if (!highlights.hasData || locked) return null;

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 my-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Baby className="w-4 h-4 text-brand-500" />
                    Resumo do Dia
                </h3>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Atualizado</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
                {[
                    { label: highlights.food, icon: Utensils, bg: 'bg-orange-50', text: 'text-orange-500' },
                    { label: highlights.sleep, icon: Moon, bg: 'bg-indigo-50', text: 'text-indigo-500' },
                    { label: highlights.mood, icon: Smile, bg: 'bg-yellow-50', text: 'text-yellow-500' },
                    { label: highlights.bathroom, icon: CheckCircle2, bg: 'bg-blue-50', text: 'text-blue-500' },
                ].map((item, idx) => (
                    <div key={idx} className={`${item.bg} p-3 rounded-xl flex flex-col items-center justify-center gap-1`}>
                        <item.icon className={`w-5 h-5 ${item.text}`} />
                        <span className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2 md:line-clamp-none">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
