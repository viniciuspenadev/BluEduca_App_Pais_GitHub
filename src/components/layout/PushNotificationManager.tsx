'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { urlBase64ToUint8Array, checkNotificationSupport } from '@/utils/push-notifications';
import { Bell, X } from 'lucide-react';

export const PushNotificationManager = () => {
    const { selectedStudent } = (require('@/contexts/StudentContext') as any).useStudent();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [showPrompt, setShowPrompt] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (checkNotificationSupport()) {
            const currentPermission = Notification.permission;
            setPermission(currentPermission);

            if (currentPermission === 'default') {
                const timer = setTimeout(() => {
                    setShowPrompt(true);
                }, 10000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const subscribeToPush = async () => {
        try {
            const reg = await navigator.serviceWorker.ready;

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !selectedStudent?.school_id) return;

            // Save to DB (Correct table: user_push_subscriptions)
            const { error } = await supabase
                .from('user_push_subscriptions')
                .upsert({
                    user_id: user.id,
                    school_id: selectedStudent.school_id,
                    subscription: subscription.toJSON(),
                    user_agent: navigator.userAgent
                }, { onConflict: 'user_id, school_id, subscription' });

            if (error) throw error;

            setPermission('granted');
            setShowPrompt(false);
        } catch (err) {
            console.error('Failed to subscribe to push', err);
        }
    };

    const handleRequestPermission = async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            await subscribeToPush();
        } else {
            setShowPrompt(false);
        }
    };

    if (!showPrompt || permission !== 'default') return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-slide-up">
            <div className="bg-white rounded-[32px] p-6 shadow-2xl border border-brand-50 flex items-center gap-5">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shrink-0">
                    <Bell className="animate-bounce-subtle" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-1">Fique por dentro!</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Deseja receber notificações de novas mensagens e eventos da escola?</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleRequestPermission}
                        className="bg-brand-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-brand-100 active:scale-95 transition-all"
                    >
                        Sim, avisar
                    </button>
                    <button
                        onClick={() => setShowPrompt(false)}
                        className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1 hover:text-slate-600 transition-all"
                    >
                        Agora não
                    </button>
                </div>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
