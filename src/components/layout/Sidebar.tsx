'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Calendar, GraduationCap, Menu, LogOut, LucideIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh(); // Refresh server state
        router.push('/login');
    };

    const navItems = [
        { path: '/home', icon: Home, label: 'Início', disabled: false },
        { path: '/diario', icon: BookOpen, label: 'Diário', disabled: false }, // TODO: Add module check
        { path: '/agenda', icon: Calendar, label: 'Agenda', disabled: false },
        { path: '/boletim', icon: GraduationCap, label: 'Boletim', disabled: false },
        { path: '/menu', icon: Menu, label: 'Menu', disabled: false },
    ];

    const isActive = (path: string) => pathname.startsWith(path);

    const SidebarItem = ({ item }: { item: typeof navItems[0] }) => {
        const active = isActive(item.path);

        if (item.disabled) {
            return (
                <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 cursor-not-allowed group relative select-none">
                    <div className="p-2 rounded-lg bg-gray-50/50">
                        <item.icon className="w-5 h-5 opacity-50" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-medium flex-1 text-left opacity-70">{item.label}</span>
                </div>
            );
        }

        return (
            <Link
                href={item.path}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${active
                        ? 'bg-brand-50 text-brand-700 font-bold shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                `}
            >
                <div className={`
                    p-2 rounded-lg transition-colors
                    ${active ? 'bg-white text-brand-600 shadow-sm' : 'bg-transparent group-hover:bg-white'}
                `}>
                    <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
            </Link>
        );
    };

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-0 bottom-0 z-30 shadow-sm">
            <div className="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px]">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-brand-sm">
                    <GraduationCap size={20} />
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">BluEduca</span>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <div className="mb-6 px-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Principal</p>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem key={item.path} item={item} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Sair do Sistema</span>
                </button>
            </div>
        </aside>
    );
};
