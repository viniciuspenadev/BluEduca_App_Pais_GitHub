'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import {
    FileText, CheckCircle, AlertCircle, Clock, Upload,
    ArrowLeft, Download, User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Eye } from 'lucide-react';

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
    const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'contracts' | 'personal'>('contracts');

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

    // Check if contract documents should be visible to parent
    const hasContractDraft = !!uploadedDocs['contract_draft'];

    // Explicitly add contract_signed to list if school provided a draft
    const allDocKeys = new Set([...templates.map(t => t.id), ...Object.keys(uploadedDocs)]);
    if (hasContractDraft) {
        allDocKeys.add('contract_signed');
    }

    // Derived State
    // 1. Separate documents into General and Contract-related
    // General Documents: Templates + Ad-hoc (except contracts)
    const generalDocKeys = Array.from(allDocKeys).filter(key => key !== 'contract_draft' && key !== 'contract_signed');

    // Helper to get public URL if only file_path exists
    const getDocUrl = (doc: any) => {
        if (doc?.url) return doc.url;
        if (doc?.file_path) {
            return supabase.storage.from('documents').getPublicUrl(doc.file_path).data.publicUrl;
        }
        return null;
    };

    const generalDocs = generalDocKeys.map((key) => {
        const template = templates.find(t => t.id === key);
        const uploaded = uploadedDocs[key];

        return {
            id: key,
            title: template?.label || uploaded?.label || key.replace(/_/g, ' '),
            status: (uploaded?.status || 'missing') as DocStatus['status'],
            reason: uploaded?.rejection_reason,
            required: template?.required || false,
            url: getDocUrl(uploaded)
        };
    }).sort((a, b) => {
        const score = (s: string) => s === 'rejected' ? 0 : s === 'missing' ? 1 : 2;
        return score(a.status) - score(b.status);
    });

    // Contract Documents: Specific objects for UI
    const contractDraft = uploadedDocs['contract_draft'];
    const contractDraftUrl = getDocUrl(contractDraft);
    const contractSigned = uploadedDocs['contract_signed'];

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
                            {[...generalDocs, contractSigned].filter(d => d?.status === 'approved').length} / {generalDocs.length + (hasContractDraft ? 1 : 0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Tabs Selector */}
            <div className="px-4 max-w-2xl mx-auto">
                <div className="flex bg-white p-1.5 rounded-2xl gap-1 shadow-sm border border-gray-100">
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                            activeTab === 'contracts'
                                ? "bg-brand-600 text-white shadow-lg shadow-brand-100"
                                : "text-gray-400 hover:bg-gray-50"
                        )}
                    >
                        <FileText className="w-4 h-4" />
                        Contrato
                    </button>
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                            activeTab === 'personal'
                                ? "bg-brand-600 text-white shadow-lg shadow-brand-100"
                                : "text-gray-400 hover:bg-gray-50"
                        )}
                    >
                        <User className="w-4 h-4" />
                        Documentos
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="px-1 max-w-2xl mx-auto pb-10">
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
                ) : activeTab === 'contracts' ? (
                    /* TAB 1: CONTRACTS */
                    <div className="space-y-4">
                        <section className="space-y-4">
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100 bg-brand-50/5 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                                <div className="space-y-6 relative">
                                    {/* Item: Draft */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-brand-100 rounded-2xl text-brand-600">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900">1. Minuta do Contrato</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">Leia atentamente as condições antes de assinar.</p>

                                                {contractDraftUrl ? (
                                                    <div className="mt-4 flex flex-col gap-2">
                                                        <button
                                                            onClick={() => setViewingDoc({ url: contractDraftUrl, title: 'Minuta do Contrato' })}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 transition-all text-sm font-black uppercase tracking-widest shadow-lg shadow-brand-100 active:scale-[0.98]"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Visualizar Minuta
                                                        </button>
                                                        <p className="text-[10px] text-center text-brand-600 font-bold mt-1">✓ Disponível para leitura</p>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 p-3 bg-gray-100 rounded-xl text-[11px] text-gray-500 italic text-center border border-dashed border-gray-300">
                                                        A escola ainda está preparando o seu contrato.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    {/* Item: Signed Upload */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={clsx(
                                                "p-3 rounded-2xl",
                                                contractSigned?.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-brand-100 text-brand-600"
                                            )}>
                                                {contractSigned?.status === 'approved' ? <CheckCircle className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900">2. Enviar Contrato Assinado</h4>
                                                <div className="text-xs mt-0.5">
                                                    {contractSigned?.status === 'approved' ? (
                                                        <span className="text-emerald-600 font-black uppercase tracking-wider">Validado com Sucesso!</span>
                                                    ) : contractSigned?.status === 'uploaded' ? (
                                                        <span className="text-amber-600 font-bold uppercase tracking-wider">Em análise pela secretaria</span>
                                                    ) : contractSigned?.status === 'rejected' ? (
                                                        <span className="text-red-500 font-bold uppercase tracking-wider">Necessário re-enviar</span>
                                                    ) : (
                                                        <span className="text-gray-400">Envie o arquivo escaneado ou foto.</span>
                                                    )}
                                                </div>

                                                {contractSigned?.status === 'rejected' && contractSigned.rejection_reason && (
                                                    <div className="mt-2 bg-red-50 p-2.5 rounded-xl text-[11px] text-red-700 border border-red-100 italic">
                                                        " {contractSigned.rejection_reason} "
                                                    </div>
                                                )}

                                                {/* ACTION: View signed contract */}
                                                {(contractSigned?.status === 'uploaded' || contractSigned?.status === 'approved' || contractSigned?.status === 'rejected') && (
                                                    <button
                                                        onClick={() => {
                                                            const url = getDocUrl(contractSigned);
                                                            if (url) setViewingDoc({ url, title: 'Contrato Assinado Enviado' });
                                                        }}
                                                        className="mt-3 text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-1.5 bg-brand-50 px-3 py-2 rounded-lg border border-brand-100 hover:bg-brand-100 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Ver arquivo enviado
                                                    </button>
                                                )}

                                                {contractSigned?.status !== 'approved' && (
                                                    <div className="mt-4">
                                                        {contractDraftUrl ? (
                                                            <>
                                                                <input
                                                                    type="file"
                                                                    id="file-contract-signed"
                                                                    className="hidden"
                                                                    accept="image/jpeg,image/png,application/pdf"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) uploadMutation.mutate({ docId: 'contract_signed', file: e.target.files[0] });
                                                                    }}
                                                                    disabled={!!uploadingDoc}
                                                                />
                                                                <label
                                                                    htmlFor="file-contract-signed"
                                                                    className={clsx(
                                                                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl cursor-pointer transition-all text-sm font-black uppercase tracking-widest",
                                                                        uploadingDoc === 'contract_signed'
                                                                            ? 'bg-gray-100 text-gray-400'
                                                                            : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-lg shadow-brand-100'
                                                                    )}
                                                                >
                                                                    {uploadingDoc === 'contract_signed' ? (
                                                                        <span>Enviando...</span>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="w-4 h-4" />
                                                                            <span>{contractSigned?.status === 'rejected' ? 'Reenviar Contrato' : 'Enviar Contrato'}</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">Disponível após a emissão da minuta.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    /* TAB 2: PERSONAL DOCUMENTS */
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {generalDocs.map((doc) => {
                                const isRejected = doc.status === 'rejected';
                                const isMissing = doc.status === 'missing';
                                const isActionable = isRejected || isMissing;

                                return (
                                    <div
                                        key={doc.id}
                                        className={clsx(
                                            "bg-white rounded-2xl p-4 shadow-sm border transition-all",
                                            isRejected ? 'border-red-200 bg-red-50/10' : 'border-gray-100'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <DocStatusIcon status={doc.status} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-900 text-sm leading-snug break-words">
                                                            {doc.title}
                                                        </h4>
                                                        {doc.required && (
                                                            <span className="shrink-0 text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                                Obrigatório
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* ACTION: View what parent uploaded */}
                                                    {doc.url && (
                                                        <button
                                                            onClick={() => setViewingDoc({ url: doc.url!, title: doc.title })}
                                                            className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors border border-brand-100"
                                                            title="Ver documento enviado"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="text-[10px]">
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
                                                    <div className="mt-2 bg-red-50 p-2 rounded-xl text-[10px] text-red-700 border border-red-50">
                                                        <p>{doc.reason}</p>
                                                    </div>
                                                )}

                                                {isActionable && (
                                                    <div className="mt-3">
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
                                                                "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-[11px] font-black uppercase tracking-widest",
                                                                uploadingDoc === doc.id
                                                                    ? 'bg-gray-100 text-gray-400'
                                                                    : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-md shadow-brand-50'
                                                            )}
                                                        >
                                                            {uploadingDoc === doc.id ? (
                                                                <span>Enviando...</span>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-3.5 h-3.5" />
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
                    </div>
                )}
            </div>
            {/* Document Viewer Modal */}
            <Modal
                isOpen={!!viewingDoc}
                onClose={() => setViewingDoc(null)}
                title={viewingDoc?.title || ''}
                size="full"
                footer={(
                    <div className="flex justify-between items-center w-full">
                        <p className="text-[10px] text-gray-500 italic max-w-xs">
                            Você pode baixar este arquivo para assinar manualmente ou usar um app de assinatura.
                        </p>
                        <a
                            href={viewingDoc?.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-700"
                        >
                            <Download className="w-4 h-4" />
                            Baixar / Abrir Original
                        </a>
                    </div>
                )}
            >
                <div className="w-full h-[70vh] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {viewingDoc?.url ? (
                        <iframe
                            src={viewingDoc.url}
                            className="w-full h-full border-none bg-white"
                            title="Visualizador de Documento"
                        />
                    ) : (
                        <div className="text-gray-400">Carregando visualização...</div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
