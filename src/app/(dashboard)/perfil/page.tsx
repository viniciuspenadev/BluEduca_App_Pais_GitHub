'use client';

import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, LogOut, Mail, Phone, Shield } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const { selectedStudent } = useStudent();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        fetchUser();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;

    return (
        <div className="min-h-screen pb-24 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="px-4 py-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">Meu Perfil</h1>
                    <p className="text-xs text-slate-500">Gerenciar conta</p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="px-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-2">
                        <User size={40} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{user?.user_metadata?.name || 'Usuário'}</h2>
                        <p className="text-sm text-slate-500">Responsável</p>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="px-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Meus Dados</h3>

                <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100/50 overflow-hidden">
                    <div className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                            <Mail size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400">Email</p>
                            <p className="font-medium text-slate-900 text-sm truncate">{user?.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                            <Phone size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400">Telefone</p>
                            <p className="font-medium text-slate-900 text-sm">{user?.user_metadata?.phone || 'Não informado'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                            <Shield size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400">ID do Usuário</p>
                            <p className="font-mono text-slate-900 text-xs truncate">{user?.id}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout */}
            <div className="px-4 pt-4">
                <button
                    onClick={handleSignOut}
                    className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                </button>
            </div>
        </div>
    );
}
