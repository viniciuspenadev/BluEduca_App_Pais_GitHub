'use client';

import { useQuery } from '@tanstack/react-query';
import { useStudent } from '@/contexts/StudentContext';
import { SmartBanners, type SmartBannerData } from '@/components/dashboard/SmartBanners';
import { DailyHighlights } from '@/components/dashboard/DailyHighlights';
import { DailyTimeline } from '@/components/dashboard/DailyTimeline';
import { DashboardFeed, type FeedItemData } from '@/components/dashboard/Feed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HomeSkeleton } from '@/components/dashboard/HomeSkeleton';
import { createClient } from '@/utils/supabase/client';

import { User, LogOut, ChevronDown, Check, GraduationCap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSettings } from '@/hooks/useAppSettings';

// Fetch function extracted specifically for React Query
const fetchDashboardData = async (studentId: string | undefined, enrollmentId: string | undefined, classId: string | undefined, schoolId: string | undefined) => {
    if (!studentId || !enrollmentId || !schoolId) return null;

    const supabase = createClient();

    // Call the RPC
    const { data, error } = await supabase.rpc('get_parent_dashboard_summary', {
        p_student_id: studentId,
        p_enrollment_id: enrollmentId,
        p_class_id: classId || null,
        p_school_id: schoolId
    });

    if (error) {
        console.error('Error fetching dashboard summary:', error);
        return null;
    }

    // Access the first row (RPC returns a table, even if 1 row)
    const result = (Array.isArray(data) && data.length > 0) ? data[0] : {};

    const banners: SmartBannerData[] = [];

    // 1. Process Overdue Finance
    if (result.overdue_finance && result.overdue_finance.length > 0) {
        banners.push({
            type: 'finance-overdue',
            title: 'Mensalidade em Atraso',
            message: `Fatura de R$ ${result.overdue_finance[0].value} venceu.`,
            actionLabel: 'Pagar Agora',
            actionLink: '/financeiro'
        });
    }

    // 2. Process Events Today
    const todayIds = new Set();
    if (result.events_today && result.events_today.length > 0) {
        result.events_today.forEach((event: any) => {
            todayIds.add(event.id);
            banners.push({
                type: 'event-today',
                title: event.title,
                message: event.location ? `Local: ${event.location}` : 'Confira os detalhes na agenda.',
                imageUrl: event.image_url,
                actionLabel: 'Ver Agenda',
                actionLink: '/cronograma',
                data: { id: event.id }
            });
        });
    }

    // 3. Process Mural Highlights (Filter out duplicates from today)
    if (result.mural_highlights && result.mural_highlights.length > 0) {
        result.mural_highlights.forEach((h: any) => {
            if (todayIds.has(h.id)) return; // Skip if already added as today event

            banners.push({
                type: 'mural-highlight',
                title: h.title,
                message: h.description || '',
                imageUrl: h.image_url,
                actionLabel: 'Ver Detalhes',
                actionLink: `/mural/${h.id}`,
                data: { id: h.id }
            });
        });
    }

    // 4. Process Daily Highlights
    const dailyHighlights = {
        hasData: !!result.daily_report?.id,
        food: 'Sem dados',
        sleep: 'Sem dados',
        mood: 'Sem dados',
        bathroom: 'Sem dados'
    };

    if (result.daily_report?.routine_data) {
        const r = result.daily_report.routine_data;
        dailyHighlights.mood = r.mood || 'Sem dados';
        if (r.meals) {
            dailyHighlights.food = r.meals.lunch || r.meals.snack || 'Sem dados';
        }
        if (r.sleep?.nap) dailyHighlights.sleep = r.sleep.nap;
        if (r.hygiene) dailyHighlights.bathroom = typeof r.hygiene === 'object' ? r.hygiene.status : r.hygiene;
    }

    // 5. Process Feed
    const feed = (result.feed_items || []).map((event: any) => ({
        id: event.id,
        type: event.category || 'event',
        title: event.title,
        description: event.description,
        date: new Date(event.start_time),
        today: new Date().toDateString() === new Date(event.start_time).toDateString(),
        isClassSpecific: !!event.class_id,
        is_pinned: event.is_pinned,
        location: event.location,
        eventType: event.event_type
    })) as FeedItemData[];

    // 6. Process Today's Classes (Timeline)
    const todaysClasses = (result.today_classes || []).map((p: any) => ({
        id: p.id,
        title: p.subject_name || 'Aula',
        description: '',
        start_time: p.start_time?.slice(0, 5),
        end_time: p.end_time?.slice(0, 5),
        type: 'academic',
        color: p.subject_color,
        // Details
        topic: p.topic,
        objective: p.objective,
        materials: p.materials,
        homework: p.homework,
        teacher_name: p.teacher_name,
        order_index: 0
    }));

    return { smartBanners: banners, dailyHighlights, feed, todaysClasses };
};

export default function HomePage() {
    const { students, selectedStudent, setSelectedStudent, loading: studentLoading } = useStudent();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();
    const { value: releaseTime } = useAppSettings('diary_release_time', '17:00');

    // Handle clicking outside the switcher
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- ANALYTICS: Log App Access (Once per Day) ---
    useEffect(() => {
        const logAccess = async () => {
            if (!selectedStudent?.school_id) return;

            const today = new Date().toISOString().split('T')[0];
            const storageKey = `app_access_log_${selectedStudent.school_id}_${today}`;

            // 1. Check LocalStorage (Client-side throttle)
            if (localStorage.getItem(storageKey)) return;

            try {
                // 2. Gather Device Info
                const ua = navigator.userAgent;
                let deviceType = 'desktop';
                if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
                else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

                let osName = 'Unknown';
                if (ua.indexOf('Win') !== -1) osName = 'Windows';
                else if (ua.indexOf('Mac') !== -1) osName = 'MacOS';
                else if (ua.indexOf('Linux') !== -1) osName = 'Linux';
                else if (ua.indexOf('Android') !== -1) osName = 'Android';
                else if (ua.indexOf('like Mac') !== -1) osName = 'iOS';

                // 3. Call RPC
                await supabase.rpc('log_app_access', {
                    p_school_id: selectedStudent.school_id,
                    p_role: 'GUARDIAN', // Parent App is always Guardian
                    p_user_agent: ua,
                    p_device_type: deviceType,
                    p_os_name: osName
                    // IP is handled by RPC/Postgres headers usually, or we skip it here if not critical
                });

                // 4. Mark as logged
                localStorage.setItem(storageKey, 'true');
            } catch (err) {
                console.error('Analytics Error:', err);
            }
        };

        // Delay slightly to not block main thread on load
        const timer = setTimeout(() => {
            logAccess();
        }, 2000);

        return () => clearTimeout(timer);
    }, [selectedStudent?.school_id]); // Run when school/student context is ready

    // Calculate Lock State
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const isDiaryLocked = currentTime < releaseTime;

    // Use React Query for data fetching - with 5min staleTime, this is usually instant
    const { data, isLoading: dashboardLoading } = useQuery({
        queryKey: ['dashboard', selectedStudent?.id],
        queryFn: () => fetchDashboardData(selectedStudent?.id, selectedStudent?.enrollment_id, selectedStudent?.class_id, selectedStudent?.school_id),
        enabled: !!selectedStudent?.id,
        // Mantém os dados anteriores enquanto carrega os novos (evita piscar)
        placeholderData: (previousData) => previousData,
    });

    if (!selectedStudent || studentLoading || (dashboardLoading && !data)) {
        if (studentLoading || dashboardLoading) {
            return <HomeSkeleton />;
        }
        return <div className="p-8 text-center text-gray-500 uppercase text-xs font-bold tracking-widest">Selecione um aluno para continuar.</div>;
    }

    const safeData = data || {
        smartBanners: [],
        dailyHighlights: { hasData: false, food: '', sleep: '', mood: '', bathroom: '' },
        feed: [],
        todaysClasses: []
    };

    return (
        <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
            {/* LEFT COLUMN - Dashboard Content */}
            {/* LEFT COLUMN - Dashboard Content */}
            <div className="md:col-span-8 relative flex flex-col min-h-[500px]">
                <div
                    className="absolute top-0 left-0 right-0 bg-brand-600 pointer-events-none"
                    style={{
                        height: '380px',
                        borderBottomLeftRadius: '50% 100px',
                        borderBottomRightRadius: '50% 100px',
                        zIndex: 0
                    }}
                />

                {/* 2. CAMADA DE INFO: Avatar e Dados (Sobre o Azul) */}
                <div className="relative z-10 px-6 pt-safe-area pt-8" ref={switcherRef}>
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            {/* Avatar & Selector Button */}
                            <button
                                onClick={() => students.length > 1 && setIsSwitcherOpen(!isSwitcherOpen)}
                                disabled={students.length <= 1}
                                className={`flex items-center gap-4 text-left transition-all ${students.length > 1 ? 'hover:opacity-80 active:scale-95' : 'cursor-default'}`}
                            >
                                <div className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden bg-white/10 relative shadow-sm">
                                    {selectedStudent.photo_url ? (
                                        <Image
                                            src={selectedStudent.photo_url}
                                            alt={selectedStudent.name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-8 h-8 text-white/40" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="text-white min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-lg font-bold leading-tight truncate tracking-tight">
                                            {selectedStudent.name}
                                        </h1>
                                        {students.length > 1 && (
                                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                                        )}
                                    </div>
                                    <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest mt-0.5">
                                        {selectedStudent.class_name || 'Turma não informada'}
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Dropdown de Troca de Aluno */}
                        {isSwitcherOpen && (
                            <div className="absolute top-24 left-6 right-6 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in zoom-in duration-200 origin-top-left max-w-sm">
                                <div className="p-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="px-4 py-3 border-b border-gray-50 mb-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seus Filhos</p>
                                    </div>
                                    <div className="space-y-1">
                                        {students.map((student) => {
                                            const isSelected = selectedStudent.id === student.id;
                                            return (
                                                <button
                                                    key={student.id}
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setIsSwitcherOpen(false);
                                                    }}
                                                    className={`
                                                        w-full flex items-center gap-4 p-3 rounded-2xl transition-all
                                                        ${isSelected
                                                            ? 'bg-brand-50 border-2 border-brand-200'
                                                            : 'hover:bg-gray-50 border-2 border-transparent active:scale-[0.98]'
                                                        }
                                                    `}
                                                >
                                                    <div className={`
                                                        w-12 h-12 rounded-full overflow-hidden border-2 shrink-0
                                                        ${isSelected ? 'border-brand-500' : 'border-gray-100'}
                                                    `}>
                                                        {student.photo_url ? (
                                                            <div className="relative w-full h-full">
                                                                <Image src={student.photo_url} alt={student.name} fill className="object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                <User className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-brand-900' : 'text-gray-900'}`}>
                                                            {student.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {student.class_name || 'Turma não informada'}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="bg-brand-500 rounded-full p-1">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Logout Button */}
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.refresh();
                                router.push('/login');
                            }}
                            className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all active:scale-95 border border-white/5 text-white/50 hover:text-white"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 3. CAMADA DE CONTEÚDO: Mural e Outros (Sobre o Azul, fundindo com o fundo) */}
                <div className="relative z-20 px-4 space-y-6">
                    <div className="px-1 -mt-2">
                        <SmartBanners banners={safeData.smartBanners} />
                    </div>

                    {/* Daily Timeline (Rotina do Dia) */}
                    <DailyTimeline
                        classId={selectedStudent.class_id}
                        enrollmentId={selectedStudent.enrollment_id}
                        externalItems={safeData.todaysClasses}
                    />

                    <div className="pt-6 pb-2">
                        <QuickActions />
                    </div>

                    <DailyHighlights highlights={safeData.dailyHighlights} locked={isDiaryLocked} />

                    <DashboardFeed items={safeData.feed} />
                </div>
            </div>

            {/* RIGHT COLUMN - Widgets & Context */}
            <div className="md:col-span-4 space-y-6 hidden md:block">
                {/* Student Mini Profile */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border-2 border-brand-100 relative">
                            {selectedStudent.photo_url ? (
                                <Image
                                    src={selectedStudent.photo_url}
                                    alt={selectedStudent.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                />
                            ) : (
                                <User className="w-8 h-8 text-gray-300 m-auto mt-4" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">{selectedStudent.name}</h3>
                            <p className="text-sm text-gray-500">{selectedStudent.class_name || 'Turma não informada'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Link href="/perfil/aluno" className="flex items-center justify-center gap-2 p-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-bold hover:bg-brand-100 transition-colors">
                            <User size={16} /> Perfil Aluno
                        </Link>
                        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="flex items-center justify-center gap-2 p-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
