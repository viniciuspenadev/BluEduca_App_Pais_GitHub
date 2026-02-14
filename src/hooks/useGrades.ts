'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';

export interface AssessmentPeriod {
    id: string;
    period_name: string;
    period_number: number;
    status: string;
}

export interface GradeBook {
    id: string;
    title: string;
    period_id: string;
    subject: string;
    max_score: number;
    weight: number;
    date: string;
    assessment_type: 'numeric' | 'concept' | 'descriptive' | 'diagnostic';
}

export interface Grade {
    id: string;
    assessment_id: string;
    score_numeric?: number;
    score_concept?: string;
    score_descriptive?: string;
    score_diagnostic?: any;
    updated_at: string;
    created_at?: string;
    author_name?: string;
}

export interface SubjectData {
    name: string;
    terms: Record<string, {
        assessments: (GradeBook & {
            grade?: number;
            grade_concept?: string;
            grade_descriptive?: string;
            author_name?: string;
            created_at?: string;
        })[];
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
            if (classIds.length === 0) return { subjects: [], periods: [] };

            // 2. Fetch Assessment Periods for the school (via student's class)
            // We'll get school_id from the first class found
            const { data: classData } = await supabase
                .from('classes')
                .select('school_id')
                .eq('id', classIds[0])
                .single();

            const { data: periods, error: pError } = await supabase
                .from('assessment_periods')
                .select('*')
                .eq('school_id', classData?.school_id)
                .eq('school_year', selectedStudent!.academic_year)
                .order('period_number', { ascending: true });

            if (pError) throw pError;

            // 3. Fetch Grade Books
            const { data: gradeBooks, error: gbError } = await supabase
                .from('grade_books')
                .select('*')
                .in('class_id', classIds)
                .order('date', { ascending: false });

            if (gbError) throw gbError;

            // 3. Fetch Grades for this student in these classes
            const assessmentIds = gradeBooks?.map(gb => gb.id) || [];
            const { data: grades, error: gError } = await supabase
                .from('student_grades')
                .select(`
                    *,
                    author:profiles!created_by(name)
                `)
                .eq('student_id', selectedStudent!.id)
                .in('grade_book_id', assessmentIds);

            if (gError) throw gError;

            // 5. Transform and Calculate
            const subjectMap: Record<string, SubjectData> = {};

            gradeBooks?.forEach((gb) => {
                const subjectName = gb.subject || 'Geral';
                const periodId = gb.period_id;

                if (!subjectMap[subjectName]) {
                    subjectMap[subjectName] = {
                        name: subjectName,
                        terms: {}
                    };
                }

                if (!subjectMap[subjectName].terms[periodId]) {
                    subjectMap[subjectName].terms[periodId] = {
                        assessments: [],
                        totalScore: 0,
                        maxPossible: 10
                    };
                }

                const gradeRecord = grades?.find(g => g.grade_book_id === gb.id);

                subjectMap[subjectName].terms[periodId].assessments.push({
                    ...gb,
                    grade: gradeRecord?.score_numeric ?? undefined,
                    grade_concept: gradeRecord?.score_concept ?? undefined,
                    grade_descriptive: gradeRecord?.score_descriptive ?? undefined
                });
            });

            // Calculate Weighted Averages (Numeric Only)
            Object.values(subjectMap).forEach(subject => {
                Object.values(subject.terms).forEach(term => {
                    let totalWeightedScore = 0;
                    let totalWeight = 0;

                    term.assessments.forEach(assessment => {
                        if (assessment.assessment_type === 'numeric' && assessment.grade !== undefined) {
                            totalWeightedScore += assessment.grade * (assessment.weight || 1);
                            totalWeight += (assessment.weight || 1);
                        }
                    });

                    term.totalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
                });
            });

            return {
                subjects: Object.values(subjectMap).sort((a, b) => a.name.localeCompare(b.name)),
                periods: periods || []
            };
        }
    });
};
