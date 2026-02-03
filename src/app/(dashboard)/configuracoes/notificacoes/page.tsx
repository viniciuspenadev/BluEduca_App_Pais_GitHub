'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, MessageCircle, DollarSign, GraduationCap } from 'lucide-react';
import { useState } from 'react';

export default function NotificationSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState({
        messages: true,
        financial: true,
        academic: true
    });

    const toggle = (key: keyof typeof settings) => {
        // In a real app, we would persist this to backend or localStorage
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

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
                    <h1 className="text-xl font-bold text-slate-900">Notificações</h1>
                    <p className="text-xs text-slate-500">Escolha o que deseja receber</p>
                </div>
            </div>

            <div className="px-4 space-y-4">
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100/50 overflow-hidden">

                    {/* Item 1 */}
                    <div className="flex items-center gap-4 p-4 border-b border-slate-50">
                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                            <MessageCircle size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">Novas Mensagens</p>
                            <p className="text-xs text-slate-400">Avisos da secretaria e coordenação</p>
                        </div>
                        <div
                            onClick={() => toggle('messages')}
                            className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.messages ? 'bg-brand-500' : 'bg-slate-200'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.messages ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center gap-4 p-4 border-b border-slate-50">
                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">Financeiro</p>
                            <p className="text-xs text-slate-400">Lembretes de vencimento e faturas</p>
                        </div>
                        <div
                            onClick={() => toggle('financial')}
                            className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.financial ? 'bg-brand-500' : 'bg-slate-200'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.financial ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                            <GraduationCap size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">Acadêmico</p>
                            <p className="text-xs text-slate-400">Notas, ocorrências e agenda</p>
                        </div>
                        <div
                            onClick={() => toggle('academic')}
                            className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.academic ? 'bg-brand-500' : 'bg-slate-200'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.academic ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                </div>

                <p className="text-xs text-slate-400 text-center px-8">
                    Para desativar completamente as notificações, acesse as configurações do seu dispositivo.
                </p>
            </div>
        </div>
    );
}
