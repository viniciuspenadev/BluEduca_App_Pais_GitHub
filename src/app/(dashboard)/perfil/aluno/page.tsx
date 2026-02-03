'use client';

import { useStudent } from '@/contexts/StudentContext';
import { getStudentFullProfile } from '@/app/actions/student-actions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, CreditCard, FileText, CheckCircle2, AlertCircle, Users
} from 'lucide-react';

import { StudentHeader } from '@/components/student/StudentHeader'; // Keeping for reference if needed elsewhere, or remove
import { DigitalStudentId } from '@/components/student/DigitalStudentId';
import { InfoCard } from '@/components/student/InfoCard';
import { HealthForm } from '@/components/student/HealthForm';

export default function StudentEnrollmentHub() {
    const router = useRouter();
    const { selectedStudent, loading: contextLoading } = useStudent();
    const [loading, setLoading] = useState(true);
    const [fullProfile, setFullProfile] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            // If context is still loading, wait.
            if (contextLoading) return;

            if (!selectedStudent?.id) {
                setLoading(false);
                return;
            }

            try {
                const data = await getStudentFullProfile(selectedStudent.id);
                if (data) {
                    setFullProfile(data);
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedStudent, contextLoading]);

    if (contextLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

    if (!selectedStudent) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Nenhum aluno selecionado</h2>
            <p className="text-slate-500 max-w-sm">Selecione um aluno no menu superior (se disponível) ou entre em contato com a escola.</p>
        </div>
    );

    if (!fullProfile) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-800">Erro ao carregar perfil</h2>
            <p className="text-slate-500 mb-6">Não foi possível buscar as informações completas da matrícula.</p>
            <button
                onClick={() => window.location.reload()}
                className="text-brand-600 font-bold hover:underline"
            >
                Tentar novamente
            </button>
        </div>
    );

    // Prepare initial data for HealthForm
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
                            grade: fullProfile.currentEnrollment?.grade,
                            status: fullProfile.currentEnrollment?.status,
                            photo_url: fullProfile.photo_url
                        }}
                        schoolYear={fullProfile.currentEnrollment?.academic_year || new Date().getFullYear()}
                        schoolName={fullProfile.school?.name}
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
                        subtext={fullProfile.enrollment?.contract_signed_at ? new Date(fullProfile.enrollment.contract_signed_at).toLocaleDateString() : 'Ver contrato'}
                        icon={FileText}
                        color="text-blue-600"
                        bg="bg-blue-50"
                        href="/documentos"
                    />
                    <InfoCard
                        title="Documentos"
                        value="Em ordem"
                        subtext="Nenhuma pendência"
                        icon={CheckCircle2}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                        href="/documentos"
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
