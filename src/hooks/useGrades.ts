'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';

export interface GradeBook {
    id: string;
    title: string;
    term: string;
    subject: string;
    max_score: number;
    weight: number;
    date: string;
}

export interface StudentGrade {
    grade_book_id: string;
    score: number;
}

export interface SubjectData {
    name: string;
    terms: Record<string, {
        assessments: (GradeBook & { grade?: number })[];
        totalScore: number;
        maxPossible: number;
    }>;
}

export const useGrades = () => {
    const { selectedStudent } = useStudent();
    const supabase = createClient();

    return useQuery({
        queryKey: ['grades', selectedStudent?.id, selectedStudent?.academic_year],
        enabled: !!selectedStudent,
        queryFn: async () => {
            // 1. Fetch Class Enrollments
            const { data: enrollments, error: enrollError } = await supabase
                .from('class_enrollments')
                .select('class_id, classes!inner(id, name, school_year)')
                .eq('student_id', selectedStudent!.id)
                .eq('classes.school_year', selectedStudent!.academic_year);

            if (enrollError) throw enrollError;

            const classIds = enrollments?.map(e => e.class_id) || [];
            if (classIds.length === 0) return [];

            // 2. Fetch Grade Books
            const { data: gradeBooks, error: gbError } = await supabase
                .from('grade_books')
                .select('*')
                .in('class_id', classIds)
                .order('date', { ascending: false });

            if (gbError) throw gbError;

            // 3. Fetch Student Grades
            const { data: grades, error: gError } = await supabase
                .from('student_grades')
                .select('*')
                .eq('student_id', selectedStudent!.id)
                .in('grade_book_id', gradeBooks?.map(gb => gb.id) || []);

            if (gError) throw gError;

            // 4. Transform and Calculate
            const subjectMap: Record<string, SubjectData> = {};

            gradeBooks?.forEach((gb) => {
                const subjectName = gb.subject || 'Geral';

                if (!subjectMap[subjectName]) {
                    subjectMap[subjectName] = {
                        name: subjectName,
                        terms: {}
                    };
                }

                if (!subjectMap[subjectName].terms[gb.term]) {
                    subjectMap[subjectName].terms[gb.term] = {
                        assessments: [],
                        totalScore: 0,
                        maxPossible: 10
                    };
                }

                const grade = grades?.find(g => g.grade_book_id === gb.id);
                subjectMap[subjectName].terms[gb.term].assessments.push({
                    ...gb,
                    grade: grade?.score
                });
            });

            // Calculate Weighted Averages
            Object.values(subjectMap).forEach(subject => {
                Object.values(subject.terms).forEach(term => {
                    let totalWeightedScore = 0;
                    let totalWeight = 0;

                    term.assessments.forEach(assessment => {
                        if (assessment.grade !== undefined) {
                            totalWeightedScore += assessment.grade * assessment.weight;
                            totalWeight += assessment.weight;
                        }
                    });

                    term.totalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
                });
            });

            return Object.values(subjectMap).sort((a, b) => a.name.localeCompare(b.name));
        }
    });
};
