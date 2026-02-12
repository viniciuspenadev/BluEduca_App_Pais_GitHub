'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Moon, HelpCircle, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
    const router = useRouter();

    const sections = [
        {
            title: 'Geral',
            items: [
                {
                    label: 'Notificações',
                    icon: Bell,
                    path: '/configuracoes/notificacoes',
                    description: 'Gerenciar alertas push'
                },
                {
                    label: 'Aparência',
                    icon: Moon,
                    path: null,
                    description: 'Em breve',
                    disabled: true
                },
            ]
        },
        {
            title: 'Suporte',
            items: [
                {
                    label: 'Ajuda e Suporte',
                    icon: HelpCircle,
                    path: null,
                    description: 'Entre em contato',
                    disabled: true
                },
            ]
        }
    ];

    return (
        <div className="min-h-screen pb-24 max-w-2xl mx-auto space-y-6">
            <div className="px-4 py-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">Ajustes</h1>
                    <p className="text-xs text-slate-500">Configurações do aplicativo</p>
                </div>
            </div>

            <div className="px-4 space-y-8">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                            {section.title}
                        </h3>
                        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100/50 overflow-hidden">
                            {section.items.map((item, itemIdx) => (
                                <button
                                    key={itemIdx}
                                    onClick={() => item.path && !item.disabled && router.push(item.path)}
                                    disabled={item.disabled}
                                    className={`
                                        w-full flex items-center gap-4 p-4 text-left transition-colors
                                        ${itemIdx !== section.items.length - 1 ? 'border-b border-slate-50' : ''}
                                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 active:bg-slate-100'}
                                    `}
                                >
                                    <div className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                        ${item.disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}
                                    `}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <span className={`font-medium block ${item.disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {item.label}
                                        </span>
                                        {item.description && (
                                            <span className="text-xs text-slate-400 block mt-0.5">
                                                {item.description}
                                            </span>
                                        )}
                                    </div>
                                    {!item.disabled && (
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
