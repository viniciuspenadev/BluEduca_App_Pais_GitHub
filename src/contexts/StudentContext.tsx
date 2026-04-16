'use client';

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

export interface Student {
    id: string;
    name: string;
    photo_url?: string;
    class_name?: string;
    age?: number;
    academic_year: number;
    enrollment_id: string;
    class_id?: string;
    school_id?: string;
    config_modules?: Record<string, boolean>;
}

interface StudentContextType {
    students: Student[];
    selectedStudent: Student | null;
    setSelectedStudent: (student: Student) => void;
    loading: boolean;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider = ({ children, initialUser }: { children: ReactNode, initialUser?: any }) => {
    const supabase = createClient();
    const router = useRouter();
    const [selectedStudentState, setSelectedStudentState] = useState<Student | null>(null);

    // Use React Query for student data - This provides instant global caching
    const { data: students = [], isLoading: loading } = useQuery({
        queryKey: ['students', initialUser?.id],
        queryFn: async () => {
            const user = initialUser || (await supabase.auth.getUser()).data.user;
            if (!user) {
                router.push('/login');
                return [];
            }

            const { data: guardianLinks, error } = await supabase
                .from('student_guardians')
                .select('student_id, students!inner(name, photo_url, birth_date)')
                .eq('guardian_id', user.id);

            if (error) throw error;
            if (!guardianLinks?.length) return [];

            const activeYear = new Date().getFullYear();

            const studentList = await Promise.all(
                guardianLinks.map(async (link: any) => {
                    // Try to get current year enrollment first (Performance optimization)
                    const { data: enrollment } = await supabase
                        .from('enrollments')
                        .select('id, academic_year, school_id, schools(config_modules)')
                        .eq('student_id', link.student_id)
                        .eq('status', 'approved')
                        .order('academic_year', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!enrollment) return null;

                    // Get class using a single query (Optimization: combine requests where possible)
                    const { data: classEnrollment } = await supabase
                        .from('class_enrollments')
                        .select('class_id, classes(name)')
                        .eq('enrollment_id', enrollment.id)
                        .maybeSingle();

                    let age;
                    if (link.students.birth_date) {
                        const birthDate = new Date(link.students.birth_date);
                        const today = new Date();
                        age = today.getFullYear() - birthDate.getFullYear();
                        if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                    }

                    return {
                        id: link.student_id,
                        name: link.students.name,
                        photo_url: link.students.photo_url,
                        class_name: (classEnrollment?.classes as any)?.name || '',
                        age,
                        academic_year: enrollment.academic_year,
                        enrollment_id: enrollment.id,
                        class_id: classEnrollment?.class_id,
                        school_id: enrollment.school_id,
                        config_modules: (enrollment.schools as any)?.config_modules || {}
                    };
                })
            );

            return studentList.filter(s => s !== null) as Student[];
        },
        staleTime: 5 * 60 * 1000, // Students list is fresh for 5 minutes (reduces DB hits)
        gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    });

    // Handle initial selection and persistence
    useEffect(() => {
        if (!loading && students.length > 0 && !selectedStudentState) {
            const savedId = typeof window !== 'undefined' ? localStorage.getItem('selectedStudentId') : null;
            const savedStudent = students.find(s => s.id === savedId);
            setSelectedStudentState(savedStudent || students[0]);
        }
    }, [students, loading, selectedStudentState]);

    const setSelectedStudent = (student: Student) => {
        setSelectedStudentState(student);
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedStudentId', student.id);
        }
    };

    // Memoize the context value to prevent unnecessary down-tree renders
    const value = useMemo(() => ({
        students,
        selectedStudent: selectedStudentState,
        setSelectedStudent,
        loading
    }), [students, selectedStudentState, loading]);

    return (
        <StudentContext.Provider value={value}>
            {children}
        </StudentContext.Provider>
    );
};

export const useStudent = () => {
    const context = useContext(StudentContext);
    if (context === undefined) {
        throw new Error('useStudent must be used within a StudentProvider');
    }
    return context;
};

