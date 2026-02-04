'use client';

import { useStudent } from '@/contexts/StudentContext';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, CreditCard, FileText, CheckCircle2, AlertCircle, Users
} from 'lucide-react';

import { DigitalStudentId } from '@/components/student/DigitalStudentId';
import { InfoCard } from '@/components/student/InfoCard';
import { HealthForm } from '@/components/student/HealthForm';
import { format } from 'date-fns';

export default function StudentEnrollmentHub() {
    const router = useRouter();
    const { selectedStudent, loading: contextLoading } = useStudent();
    const supabase = createClient();

    // 🚀 Robust Client-Side Fetching
    const { data: fullProfile, isLoading, isError, error } = useQuery({
        queryKey: ['fullProfile', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent?.id) return null;

            console.log('🔄 [Profile] Fetching full profile for:', selectedStudent.id);

            // 1. Get Enrollments (All history)
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('id, status, academic_year, details, created_at')
                .eq('student_id', selectedStudent.id)
                .order('created_at', { ascending: false });

            if (enrollError) throw enrollError;

            // 2. Financial Check (Across ALL enrollments)
            let financialStatus = 'ok';
            let documentsStatus = 'ok';
            const enrollmentIds = enrollments?.map(e => e.id) || [];

            if (enrollmentIds.length > 0) {
                // Fetch basic installment info
                const { data: installments, error: instError } = await supabase
                    .from('installments')
                    .select('id, due_date, status')
                    .in('enrollment_id', enrollmentIds);

                if (instError) console.error('Error fetching installments:', instError);

                if (installments && installments.length > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Midnight today

                    // Check for ANY debt
                    const hasDebt = installments.some(item => {
                        if (item.status === 'overdue') return true;

                        if (item.status === 'pending' && item.due_date) {
                            // Robust Date Check
                            // "2026-02-03" -> Treats as Noon local day to avoid timezone shifts
                            const parts = item.due_date.split('-');
                            const dueDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

                            // Compare purely timestamps? Or just simplified logic.
                            // If dueDate (Noon Feb 3) < Today (Midnight Feb 4) -> It is LATE.
                            if (dueDate < today) return true;
                        }
                        return false;
                    });

                    if (hasDebt) financialStatus = 'overdue';
                    console.log(`💰 [Profile] Financial Status: ${financialStatus}`);
                }
            }

            // 3. Document Check (Latest Enrollment)
            const latestEnrollment = enrollments?.[0] || null;
            if (latestEnrollment?.details?.documents) {
                const docs = latestEnrollment.details.documents;
                const hasRejected = Object.values(docs).some((d: any) => d.status === 'rejected');
                if (hasRejected) documentsStatus = 'rejected';
            }

            // 4. Get Health Info // (Actually already have it from student context partially, but fetching fresh is good)
            const { data: studentData } = await supabase
                .from('students')
                .select('health_info, photo_url, school:schools(name)')
                .eq('id', selectedStudent.id)
                .single();

            // Extract School Name safely
            // @ts-ignore
            const schoolVal = studentData?.school as any;
            const schoolName = Array.isArray(schoolVal) ? schoolVal[0]?.name : schoolVal?.name;

            return {
                ...selectedStudent,
                photo_url: studentData?.photo_url,
                health_info: studentData?.health_info,
                enrollments,
                currentEnrollment: latestEnrollment,
                financialStatus,
                documentsStatus,
                school_name: schoolName
            };
        },
        enabled: !!selectedStudent?.id,
        refetchOnWindowFocus: true // Ensure fresh data when coming back from paying
    });

    // Loading State
    if (contextLoading || (isLoading && selectedStudent)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
                <p className="text-slate-400 font-medium text-sm animate-pulse">Carregando perfil...</p>
            </div>
        );
    }

    // No Student Selected
    if (!selectedStudent) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                    <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Nenhum aluno selecionado</h2>
            </div>
        );
    }

    // Error State
    if (isError || !fullProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-lg font-bold text-slate-800">Erro ao carregar perfil</h2>
                <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                    {/* @ts-ignore */}
                    {error?.message || "Não foi possível buscar as informações."}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-brand-600 font-bold hover:underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    // Prepare Health Data
    const healthInitialData = {
        blood_type: fullProfile.health_info?.blood_type || '',
        allergies: fullProfile.health_info?.allergies || [],
        medications_allowed: fullProfile.health_info?.medications_allowed || [],
        medications_restricted: fullProfile.health_info?.medications_restricted || [],
        health_insurance: fullProfile.health_info?.health_insurance || '',
        health_insurance_number: fullProfile.health_info?.health_insurance_number || '',
        health_observations: fullProfile.health_info?.health_observations || fullProfile.health_info?.medications || '',
        habits: fullProfile.health_info?.habits || {
            sleep: { bedtime: '', wakes_up: '' },
            food: { restrictions: '', appetite: '' },
            hygiene: { diapers: '' },
            social: { behavior: '' }
        }
    };

    return (
        <div className="min-h-screen pb-24 max-w-3xl mx-auto space-y-8 bg-slate-50/50">
            {/* Header Standardized */}
            <div className="px-4 py-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">Minha Matrícula</h1>
                    <p className="text-xs text-slate-500">{fullProfile.name}</p>
                </div>
            </div>

            <div className="px-4 space-y-8">
                {/* 1. Hero Identity (Digital ID) */}
                <div className="flex justify-center">
                    <DigitalStudentId
                        student={{
                            name: fullProfile.name,
                            id: fullProfile.id,
                            grade: fullProfile.currentEnrollment?.details?.grade, // Fixed access
                            status: fullProfile.currentEnrollment?.status,
                            photo_url: fullProfile.photo_url
                        }}
                        schoolYear={fullProfile.currentEnrollment?.academic_year || new Date().getFullYear()}
                        schoolName={fullProfile.school_name}
                    />
                </div>

                {/* 2. Quick Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard
                        title="Financeiro"
                        value={fullProfile.financialStatus === 'overdue' ? 'Fatura em Aberto' : 'Em dia'}
                        subtext="Ver extrato"
                        icon={CreditCard}
                        color={fullProfile.financialStatus === 'overdue' ? 'text-red-600' : 'text-green-600'}
                        bg={fullProfile.financialStatus === 'overdue' ? 'bg-red-50' : 'bg-green-50'}
                        href="/financeiro"
                        alert={fullProfile.financialStatus === 'overdue'}
                    />
                    <InfoCard
                        title="Contrato"
                        value="Assinado"
                        subtext={fullProfile.currentEnrollment?.created_at ? format(new Date(fullProfile.currentEnrollment.created_at), 'dd/MM/yyyy') : 'Ver contrato'}
                        icon={FileText}
                        color="text-blue-600"
                        bg="bg-blue-50"
                        href="/documentos"
                    />
                    <InfoCard
                        title="Documentos"
                        value={fullProfile.documentsStatus === 'rejected' ? 'Regularizar' : 'Em ordem'}
                        subtext={fullProfile.documentsStatus === 'rejected' ? 'Documento rejeitado' : 'Tudo certo'}
                        icon={fullProfile.documentsStatus === 'rejected' ? AlertCircle : CheckCircle2}
                        color={fullProfile.documentsStatus === 'rejected' ? 'text-amber-600' : 'text-emerald-600'}
                        bg={fullProfile.documentsStatus === 'rejected' ? 'bg-amber-50' : 'bg-emerald-50'}
                        href="/documentos"
                        alert={fullProfile.documentsStatus === 'rejected'}
                    />
                </div>

                <hr className="border-slate-200" />

                {/* 3. Health Editor */}
                <HealthForm
                    studentId={fullProfile.id}
                    initialData={healthInitialData}
                    readOnly={true}
                />
            </div>
        </div>
    );
}
