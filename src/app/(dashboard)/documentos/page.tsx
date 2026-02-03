'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import {
    FileText, CheckCircle, AlertCircle, Clock, Upload,
    ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

// Types
interface DocTemplate {
    id: string;
    label: string;
    required: boolean;
}

interface DocStatus {
    status: 'missing' | 'uploaded' | 'submitted' | 'approved' | 'rejected';
    url?: string;
    uploaded_at?: string;
    rejection_reason?: string;
    label?: string;
}

interface Enrollment {
    id: string;
    school_id: string;
    details: {
        documents?: Record<string, DocStatus>;
    };
}

const DEFAULT_TEMPLATES: DocTemplate[] = [
    { id: 'transfer', label: 'Declaração de Transferência', required: true },
    { id: 'report_card', label: 'Histórico Escolar', required: true },
    { id: 'vaccination', label: 'Carteirinha de Vacinação', required: true },
    { id: 'cpf', label: 'CPF do Aluno', required: false },
    { id: 'residency', label: 'Comprovante de Residência', required: true }
];

const DocStatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'approved': return <div className="p-2 bg-emerald-50 rounded-full"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>;
        case 'rejected': return <div className="p-2 bg-red-50 rounded-full"><AlertCircle className="w-5 h-5 text-red-500" /></div>;
        case 'submitted':
        case 'uploaded': return <div className="p-2 bg-amber-50 rounded-full"><Clock className="w-5 h-5 text-amber-500" /></div>;
        default: return <div className="p-2 bg-gray-50 rounded-full"><div className="w-5 h-5 rounded-full border-2 border-gray-300 border-dashed" /></div>;
    }
};

export default function DocumentsPage() {
    const { selectedStudent, loading: studentLoading } = useStudent();
    const router = useRouter();
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    // Fetch Enrollment
    const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
        queryKey: ['enrollment', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent?.id) return null;
            const { data, error } = await supabase
                .from('enrollments')
                .select('*')
                .eq('student_id', selectedStudent.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data as Enrollment;
        },
        enabled: !!selectedStudent?.id
    });

    // Fetch Templates
    const { data: templates = DEFAULT_TEMPLATES } = useQuery({
        queryKey: ['doc_templates', enrollment?.school_id],
        queryFn: async () => {
            if (!enrollment?.school_id) return DEFAULT_TEMPLATES;
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('school_id', enrollment.school_id)
                .eq('key', 'enrollment_docs_template')
                .maybeSingle();

            if (data?.value) {
                try {
                    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (Array.isArray(parsed)) return parsed as DocTemplate[];
                } catch (e) {
                    console.error('Failed to parse doc templates', e);
                }
            }
            return DEFAULT_TEMPLATES;
        },
        enabled: !!enrollment?.school_id
    });

    // Handle Upload
    const uploadMutation = useMutation({
        mutationFn: async ({ docId, file }: { docId: string, file: File }) => {
            if (!enrollment) throw new Error("No enrollment found");

            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) throw new Error("O arquivo deve ter no máximo 5MB.");

            setUploadingDoc(docId);

            const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${docId}_${Date.now()}_${sanitizedOriginalName}`;
            const filePath = `enrollments/${enrollment.id}/${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

            // Update Enrollment JSON
            const currentDocs = enrollment.details?.documents || {};
            const newDocs = {
                ...currentDocs,
                [docId]: {
                    status: 'uploaded',
                    url: publicUrl,
                    uploaded_at: new Date().toISOString(),
                    label: templates.find(t => t.id === docId)?.label || docId
                }
            };

            const { error: updateError } = await supabase
                .from('enrollments')
                .update({
                    details: { ...enrollment.details, documents: newDocs }
                })
                .eq('id', enrollment.id);

            if (updateError) throw updateError;

            // Log History
            await supabase.from('enrollment_history').insert({
                enrollment_id: enrollment.id,
                school_id: enrollment.school_id,
                action_type: 'UPLOAD',
                title: 'Documento Reenviado (App)',
                description: `Documento enviado via App: ${docId}`,
                metadata: { doc_id: docId }
            });

            return docId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment'] });
            alert("Documento enviado com sucesso!");
        },
        onError: (error: Error) => {
            alert(error.message);
        },
        onSettled: () => {
            setUploadingDoc(null);
        }
    });

    // Derived State
    const uploadedDocs = enrollment?.details?.documents || {};
    const allDocKeys = new Set([...templates.map(t => t.id), ...Object.keys(uploadedDocs)]);

    // Sort logic from Legacy: Rejected first, then Missing, then others. Score-based.
    const docList = Array.from(allDocKeys).map((key) => {
        const template = templates.find(t => t.id === key);
        const uploaded = uploadedDocs[key];

        return {
            id: key,
            title: template?.label || uploaded?.label || key.replace(/_/g, ' '),
            status: (uploaded?.status || 'missing') as DocStatus['status'],
            reason: uploaded?.rejection_reason,
            required: template?.required || false
        };
    }).sort((a, b) => {
        const score = (s: string) => s === 'rejected' ? 0 : s === 'missing' ? 1 : 2;
        return score(a.status) - score(b.status);
    });

    if (studentLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;

    return (
        <div className="space-y-8 pb-24 max-w-2xl mx-auto">
            {/* Legacy Header Style */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-brand-100 rounded-xl text-brand-600 hover:bg-brand-200 transition-colors"
                    >
                        <FileText className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Documentos</h2>
                        <p className="text-xs text-gray-400 font-medium tracking-tight">Mantenha a secretaria atualizada</p>
                    </div>
                </div>

                {!enrollmentLoading && enrollment && (
                    <div className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Validados</span>
                        <span className="text-xs font-bold text-brand-600">
                            {docList.filter(d => d.status === 'approved').length}/{docList.length}
                        </span>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="px-1 max-w-2xl mx-auto space-y-6">
                {enrollmentLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-gray-500 font-bold tracking-tight">Buscando documentos...</p>
                    </div>
                ) : !enrollment ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Nenhuma Matrícula</h2>
                        <p className="text-gray-500 text-sm">Não encontramos pendências documentais.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {docList.map((doc) => {
                            const isRejected = doc.status === 'rejected';
                            const isMissing = doc.status === 'missing';
                            const isActionable = isRejected || isMissing;

                            return (
                                <div
                                    key={doc.id}
                                    className={clsx(
                                        "bg-white rounded-2xl p-5 shadow-sm border transition-all",
                                        isRejected ? 'border-red-200 bg-red-50/10' : 'border-gray-100'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <DocStatusIcon status={doc.status} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <h3 className="font-bold text-gray-900 text-base leading-snug break-words">
                                                    {doc.title}
                                                </h3>
                                                {doc.required && (
                                                    <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                        Obrigatório
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-xs">
                                                {isRejected ? (
                                                    <span className="text-red-500 font-bold uppercase tracking-wider">Recusado</span>
                                                ) : isMissing ? (
                                                    <span className="text-gray-400 font-bold uppercase tracking-wider">Pendente</span>
                                                ) : doc.status === 'approved' ? (
                                                    <span className="text-emerald-600 font-bold uppercase tracking-wider">Validado</span>
                                                ) : (
                                                    <span className="text-amber-600 font-bold uppercase tracking-wider">Em análise</span>
                                                )}
                                            </div>

                                            {isRejected && doc.reason && (
                                                <div className="mt-3 bg-red-50 p-3 rounded-xl text-xs text-red-700 border border-red-100">
                                                    <p>{doc.reason}</p>
                                                </div>
                                            )}

                                            {isActionable && (
                                                <div className="mt-4">
                                                    <input
                                                        type="file"
                                                        id={`file-${doc.id}`}
                                                        className="hidden"
                                                        accept="image/jpeg,image/png,application/pdf"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) uploadMutation.mutate({ docId: doc.id, file: e.target.files[0] });
                                                        }}
                                                        disabled={!!uploadingDoc}
                                                    />
                                                    <label
                                                        htmlFor={`file-${doc.id}`}
                                                        className={clsx(
                                                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-bold uppercase tracking-widest",
                                                            uploadingDoc === doc.id
                                                                ? 'bg-gray-100 text-gray-400'
                                                                : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-lg shadow-brand-100'
                                                        )}
                                                    >
                                                        {uploadingDoc === doc.id ? (
                                                            <span>Enviando...</span>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" />
                                                                <span>{isRejected ? 'Reenviar' : 'Enviar'}</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
