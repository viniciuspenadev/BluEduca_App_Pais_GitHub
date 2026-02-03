import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { StudentProvider } from '@/contexts/StudentContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { PushNotificationManager } from '@/components/layout/PushNotificationManager';

export default async function DashboardLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Pre-fetch critical data here if needed, or pass user to context
    // The StudentContext will handle fetching students client-side for now
    // to maintain parity with the original logic, which is complex.

    return (
        <StudentProvider initialUser={user}>
            <PushNotificationManager />
            <div className="min-h-screen bg-gray-50 flex overflow-hidden">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Main Content Wrapper */}
                <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
                    <Header />

                    {/* Header Spacer */}
                    <div className="h-16 md:h-[72px] shrink-0" />

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto pb-24 md:pb-8 scrollbar-hide w-full max-w-[1920px] mx-auto px-4 py-6 md:p-8">
                        {children}
                    </main>
                </div>

                {/* Mobile Bottom Nav */}
                <BottomNav />

                {/* Parallel Route Modal Slot */}
                {modal}
            </div>
        </StudentProvider>
    );
}
