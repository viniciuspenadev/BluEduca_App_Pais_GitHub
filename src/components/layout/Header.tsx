'use client';

import { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Check, LogOut } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export const Header = () => {
    const { students, selectedStudent, setSelectedStudent, loading: studentsLoading } = useStudent();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === '/home' || pathname === '/';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-brand-600 md:bg-white md:border-b md:border-gray-200 text-white md:text-gray-900 px-5 pt-safe-area pb-2 flex justify-between items-center fixed top-0 left-0 right-0 md:left-64 z-50 shadow-md md:shadow-sm h-16 md:h-[72px]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Student Selector Dropdown */}
                <div className="relative max-w-sm" ref={dropdownRef}>
                    <button
                        onClick={() => !studentsLoading && setDropdownOpen(!dropdownOpen)}
                        disabled={studentsLoading || students.length === 0}
                        className={`
                            flex items-center gap-3 rounded-xl p-2 transition-all disabled:opacity-50 text-left
                            md:hover:bg-gray-50 md:border md:border-transparent md:hover:border-gray-200 md:pr-4
                            ${dropdownOpen ? 'md:bg-gray-50 md:border-gray-200' : ''}
                        `}
                    >
                        {/* Avatar */}
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm border-2 shrink-0 overflow-hidden shadow-sm
                            md:bg-gray-100 md:border-gray-200 md:text-gray-400
                            bg-white/20 border-white/30 text-white
                        `}>
                            {selectedStudent?.photo_url ? (
                                <img
                                    src={selectedStudent.photo_url}
                                    alt={selectedStudent?.name || 'Aluno'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                            <p className="text-xs font-medium md:text-gray-500 text-brand-100 uppercase tracking-wider">
                                {studentsLoading ? 'Carregando...' : (selectedStudent?.class_name || 'Aluno')}
                            </p>
                            <h1 className="text-sm font-bold truncate md:text-gray-900 leading-tight">
                                {selectedStudent?.name || 'Selecione o Aluno'}
                            </h1>
                        </div>

                        {/* Chevron */}
                        {students.length > 1 && (
                            <ChevronDown
                                className={`w-4 h-4 transition-transform shrink-0 ml-1 md:text-gray-400 text-brand-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                            />
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && students.length > 1 && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-slide-down md:shadow-2xl z-50">
                            <div className="p-2 max-h-[320px] overflow-y-auto text-gray-900">
                                {students.map((student) => {
                                    const isSelected = selectedStudent?.id === student.id;
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                setSelectedStudent(student);
                                                setDropdownOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center gap-3 p-3 rounded-xl transition-all
                                                ${isSelected
                                                    ? 'bg-brand-50 border-2 border-brand-500'
                                                    : 'hover:bg-gray-50 border-2 border-transparent hover:scale-[1.02]'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden
                                                ${isSelected ? 'ring-2 ring-brand-500 ring-offset-2' : 'bg-gray-100'}
                                            `}>
                                                {student.photo_url ? (
                                                    <img
                                                        src={student.photo_url}
                                                        alt={student.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-brand-700' : 'text-gray-900'}`}>
                                                    {student.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {student.class_name || 'Aluno'}
                                                </p>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {/* Notification Center will go here */}
                {/* Logout Button (Mobile Only) */}
                <button onClick={handleSignOut} className="md:hidden p-2 hover:bg-white/10 rounded-full text-white">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};
