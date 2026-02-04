'use client';

import { useQuery } from '@tanstack/react-query';
import { useStudent } from '@/contexts/StudentContext';
import { SmartBanners, type SmartBannerData } from '@/components/dashboard/SmartBanners';
import { DailyHighlights } from '@/components/dashboard/DailyHighlights';
import { DailyTimeline } from '@/components/dashboard/DailyTimeline';
import { DashboardFeed, type FeedItemData } from '@/components/dashboard/Feed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { createClient } from '@/utils/supabase/client';

import { User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSettings } from '@/hooks/useAppSettings';

// Fetch function extracted specifically for React Query
const fetchDashboardData = async (studentId: string | undefined, enrollmentId: string | undefined, classId: string | undefined) => {
    if (!studentId || !enrollmentId) return null;

    const supabase = createClient();

    // Call the RPC
    const { data, error } = await supabase.rpc('get_parent_dashboard_summary', {
        p_student_id: studentId,
        p_enrollment_id: enrollmentId,
        p_class_id: classId || null
    });

    if (error) {
        console.error('Error fetching dashboard summary:', error);
        return null;
    }

    // Access the first row (RPC returns a table, even if 1 row)
    const result = (Array.isArray(data) && data.length > 0) ? data[0] : null;
    if (!result) return null;

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
    if (result.events_today && result.events_today.length > 0) {
        banners.push({
            type: 'event-today',
            title: result.events_today[0].title,
            message: result.events_today[0].location ? `Local: ${result.events_today[0].location}` : 'Confira os detalhes na agenda.',
            actionLabel: 'Ver Agenda',
            actionLink: '/cronograma'
        });
    }

    // 3. Process Mural Highlights
    if (result.mural_highlights && result.mural_highlights.length > 0) {
        result.mural_highlights.forEach((h: any) => {
            banners.push({
                type: 'mural-highlight',
                title: h.title,
                message: h.description || '',
                imageUrl: h.image_url,
                actionLabel: 'Ver Detalhes',
                actionLink: `/mural/${h.id}`
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
    const { selectedStudent, loading: studentLoading } = useStudent();
    const supabase = createClient();
    const router = useRouter();
    const { value: releaseTime } = useAppSettings('diary_release_time', '17:00');

    // Calculate Lock State
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const isDiaryLocked = currentTime < releaseTime;

    // Use React Query for data fetching - with 5min staleTime, this is usually instant
    const { data, isLoading: dashboardLoading } = useQuery({
        queryKey: ['dashboard', selectedStudent?.id],
        queryFn: () => fetchDashboardData(selectedStudent?.id, selectedStudent?.enrollment_id, selectedStudent?.class_id),
        enabled: !!selectedStudent?.id,
        // Mantém os dados anteriores enquanto carrega os novos (evita piscar)
        placeholderData: (previousData) => previousData,
    });

    if (!selectedStudent) {
        if (studentLoading) {
            return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
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
            <div className="md:col-span-8 space-y-6">
                <SmartBanners banners={safeData.smartBanners} />

                {/* Daily Timeline (Rotina do Dia) */}
                <DailyTimeline
                    classId={selectedStudent.class_id}
                    enrollmentId={selectedStudent.enrollment_id}
                    externalItems={safeData.todaysClasses}
                />

                <div className="py-2">
                    <QuickActions />
                </div>

                <DailyHighlights highlights={safeData.dailyHighlights} locked={isDiaryLocked} />

                <DashboardFeed items={safeData.feed} />
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
