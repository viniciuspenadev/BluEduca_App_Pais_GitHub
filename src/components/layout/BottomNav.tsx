'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, BookOpen, Calendar, Menu } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

export const BottomNav = () => {
    const pathname = usePathname();
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const [hidden, setHidden] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    const navItems = [
        { path: '/home', icon: Home, label: 'Início' },
        { path: '/diario', icon: BookOpen, label: 'Diário' },
        { path: '/agenda', icon: Calendar, label: 'Agenda' },
        { path: '/menu', icon: Menu, label: 'Menu' },
    ];

    useEffect(() => {
        setPendingPath(null);
    }, [pathname]);

    const isActive = (path: string) => (pendingPath === path) || pathname.startsWith(path);

    const handleLinkClick = (path: string) => {
        setPendingPath(path);
    };

    // Hide BottomNav on communication detail pages and all chat routes
    const isComunicadoDetail = pathname.includes('/comunicados/') && pathname.split('/').length > 2;
    const isChatRoute = pathname.startsWith('/chat');

    if (isComunicadoDetail || isChatRoute) return null;

    return (
        <AnimatePresence>
            <motion.nav
                variants={{
                    visible: { y: 0, opacity: 1 },
                    hidden: { y: 100, opacity: 0 }
                }}
                animate={hidden ? "hidden" : "visible"}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-gray-200/50 z-[70] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-2 py-2 w-[90%] max-w-[360px]"
            >
                <div className="flex justify-between items-center w-full relative">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => handleLinkClick(item.path)}
                                className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 isolate`}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="navbar-active-bubble"
                                        className="absolute inset-0 m-auto w-12 h-12 bg-brand-500 rounded-full -z-10 shadow-lg shadow-brand-500/30"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <motion.div layout className="p-1">
                                    <item.icon
                                        className={`w-6 h-6 transition-colors duration-300 ${active ? 'text-white' : 'text-gray-400'}`}
                                        strokeWidth={active ? 2.5 : 2}
                                    />
                                </motion.div>

                                {active ? (
                                    <span className="text-[9px] font-bold text-gray-500 absolute -bottom-1 opacity-0 h-3">
                                        {item.label}
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-bold text-gray-400 mt-0.5">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </motion.nav>
        </AnimatePresence>
    );
};
