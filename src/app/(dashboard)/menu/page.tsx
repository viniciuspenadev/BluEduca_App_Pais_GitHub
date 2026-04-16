'use client';

import { type FC } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, CreditCard, Clock,
    MessageCircle, Settings, LogOut, User,
    ChevronRight,
    GraduationCap,
    BookOpen,
    UtensilsCrossed,
    ArrowLeft,
    FileText,
    Bell,
    type LucideIcon,
    LayoutGrid
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useStudent } from '@/contexts/StudentContext';
import { useAlerts } from '@/hooks/useAlerts';

interface MenuItem {
    label: string;
    icon: LucideIcon;
    path?: string;
    disabled?: boolean;
    badge?: string;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

export default function MenuPage() {
    const router = useRouter();
    const supabase = createClient();
    const { selectedStudent } = useStudent();
    const { alerts } = useAlerts();

    const hasModule = (module: string) => {
        return !!selectedStudent?.config_modules?.[module];
    };

    // Determine badge based on pending docs

    const menuGroups: MenuGroup[] = [
        {
            title: 'Secretaria',
            items: [
                {
                    label: 'Documentos da Matrícula',
                    icon: FileText,
                    path: '/documentos',
                    badge: alerts.documents > 0 ? `${alerts.documents} Pendência${alerts.documents > 1 ? 's' : ''}` : undefined,
                    disabled: false
                },
            ]
        },
        {
            title: 'Acadêmico',
            items: [
                { label: 'Atividades', icon: Clock, path: '/cronograma', disabled: !hasModule('academic') },
                { label: 'Agenda', icon: Calendar, path: '/agenda', disabled: !hasModule('academic') },
                { label: 'Cardápio', icon: UtensilsCrossed, path: '/cardapio', disabled: !hasModule('menu') },
                { label: 'Diário de Classe', icon: BookOpen, path: '/diario', disabled: !hasModule('academic') },
                { label: 'Boletim', icon: GraduationCap, path: '/boletim', disabled: !hasModule('academic') }, // Future
                { label: 'Minha Matrícula', icon: User, path: '/perfil/aluno', disabled: false },
            ]
        },
        {
            title: 'Atendimento',
            items: [
                { label: 'Mensagens', icon: MessageCircle, path: '/chat', disabled: !hasModule('chat'), badge: (alerts.chat && alerts.chat > 0) ? `${alerts.chat}` : undefined },
            ]
        },
        {
            title: 'Comunicação',
            items: [
                { label: 'Comunicados', icon: FileText, path: '/comunicados', disabled: !hasModule('communications'), badge: alerts.messages > 0 ? `${alerts.messages}` : undefined },
            ]
        },
        {
            title: 'Financeiro',
            items: [
                { label: 'Financeiro', icon: CreditCard, path: '/financeiro', disabled: !hasModule('finance') },
            ]
        },
        {
            title: 'Configurações',
            items: [
                { label: 'Notificações', icon: Bell, path: '/configuracoes/notificacoes', disabled: false },
                { label: 'Perfil do Aluno', icon: User, path: '/perfil', disabled: false },
                { label: 'Ajustes do App', icon: Settings, path: '/configuracoes', disabled: false },
            ]
        }
    ];

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen pb-24 max-w-2xl mx-auto">
            <div className="px-4 py-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">Menu</h1>
                    <p className="text-xs text-slate-500">{selectedStudent?.name || 'Aluno'}</p>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100/50 overflow-hidden">
                        <h3 className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {group.title}
                        </h3>
                        <div className="flex flex-col">
                            {group.items.map((item, itemIdx) => {
                                const ItemContent = () => (
                                    <>
                                        <div className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                            ${item.disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}
                                        `}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <span className={`font-medium ${item.disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {item.badge && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${String(item.badge).includes('Pendência') || item.badge === 'Novo'
                                                ? 'bg-red-500 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                        {!item.disabled && (
                                            <ChevronRight className="w-4 h-4 text-slate-300" />
                                        )}
                                    </>
                                );

                                if (item.disabled || !item.path) {
                                    return (
                                        <button
                                            key={itemIdx}
                                            onClick={() => {
                                                if (item.disabled && item.path === '/chat') {
                                                    window.alert("Módulo Inativo: O atendimento via chat não está habilitado para esta escola.");
                                                }
                                            }}
                                            className={`
                                                flex items-center w-full gap-4 p-4 transition-colors text-left cursor-not-allowed opacity-50
                                                ${itemIdx !== group.items.length - 1 ? 'border-b border-slate-50' : ''}
                                            `}
                                        >
                                            <ItemContent />
                                        </button>
                                    );
                                }

                                return (
                                    <Link
                                        key={itemIdx}
                                        href={item.path}
                                        className={`
                                            flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left active:bg-slate-100
                                            ${itemIdx !== group.items.length - 1 ? 'border-b border-slate-50' : ''}
                                        `}
                                    >
                                        <ItemContent />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleSignOut}
                    className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                </button>

                <p className="text-center text-xs text-slate-400 py-4">
                    Versão 2.1.0 (Next.js Port)
                </p>
            </div>
        </div>
    );
};
