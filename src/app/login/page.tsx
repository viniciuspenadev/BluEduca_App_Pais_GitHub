'use client'

import { useState, useTransition } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { ToastContainer, type ToastMessage } from '@/components/ui/Toast';
import { login } from './actions';

export default function LoginPage() {
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts([...toasts, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await login(null, formData);
            if (result?.error) {
                addToast(result.error, 'error');
            }
        });
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans overflow-hidden">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Left Side: Visuals - Modern SaaS/Startup Aesthetic */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-50 items-center justify-center p-12 z-20 border-r border-slate-100">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />

                {/* Ambient Gradients - "Aurora" effect */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-300/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 animate-pulse-slow delay-700" />
                <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-purple-300/30 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col justify-center items-center text-center max-w-lg">
                    <div className="relative group cursor-default">
                        <div className="absolute -inset-4 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full blur-xl opacity-0 group-hover:opacity-70 transition duration-1000"></div>
                        <Image
                            src="/assets/IMG/logo_completo.png"
                            alt="Logo"
                            width={300}
                            height={112}
                            priority
                            className="h-28 w-auto mb-10 object-contain relative transition-transform duration-500 hover:scale-105"
                        />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 leading-[1.15] tracking-tight">
                        Transformando futuros com <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600">educação de excelência.</span>
                    </h1>

                    <p className="text-lg text-slate-600 leading-relaxed font-medium max-w-md mx-auto">
                        Junte-se a milhares de famílias que acompanham o desenvolvimento escolar em tempo real.
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 bg-white relative z-10">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-12 text-center animate-fade-in">
                        <Image
                            src="/assets/IMG/logo_completo.png"
                            alt="Logo Escola"
                            width={150}
                            height={60}
                            className="h-16 w-auto mx-auto object-contain"
                        />
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-8 lg:p-10 border border-white animate-slide-up">
                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Entrar</h2>
                            <p className="text-gray-500 font-medium">Acesse o Portal da Família</p>
                        </div>

                        <form action={handleSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 ml-1">
                                    E-mail de acesso
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all duration-300 font-medium text-gray-900"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 ml-1">
                                    Sua senha
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-12 pr-12 py-3.5 border border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all duration-300 font-medium text-gray-900"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-end">
                                    <button type="button" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                                        Esqueceu a senha?
                                    </button>
                                </div>
                            </div>

                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-200 hover:shadow-brand-300 hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Entrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Entrar no Portal</span>
                                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                            <p className="text-xs text-gray-400 font-medium">
                                &copy; 2026 BluEduca. Todos os direitos reservados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
