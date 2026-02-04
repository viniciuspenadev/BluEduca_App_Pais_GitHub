import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';

export interface Alerts {
    documents: number;
    messages: number;
    financial: number;
    total: number;
}

const DEFAULT_TEMPLATES = [
    { id: 'transfer', label: 'Declaração de Transferência', required: true },
    { id: 'report_card', label: 'Histórico Escolar', required: true },
    { id: 'vaccination', label: 'Carteirinha de Vacinação', required: true },
    { id: 'cpf', label: 'CPF do Aluno', required: false },
    { id: 'residency', label: 'Comprovante de Residência', required: true }
];

export const useAlerts = () => {
    const { selectedStudent } = useStudent();
    const supabase = createClient();
    const queryClient = useQueryClient();

    // Set up Realtime subscriptions
    useEffect(() => {
        if (!selectedStudent?.id) return;

        console.log('🔌 [Realtime] Conectando channels de alertas...');

        // 1. Communications / Messages
        const msgChannel = supabase
            .channel(`alerts-messages-${selectedStudent.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'communication_recipients'
                    // We can filter by guardian_id if needed, but RLS handles visibility
                },
                (payload) => {
                    console.log('⚡ [Realtime] Nova mensagem detectada:', payload);
                    queryClient.invalidateQueries({ queryKey: ['alerts', selectedStudent.id] });
                    queryClient.invalidateQueries({ queryKey: ['communications', selectedStudent.id] });
                }
            )
            .subscribe();

        // 2. Documents (Enrollments)
        const docChannel = supabase
            .channel(`alerts-documents-${selectedStudent.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'enrollments',
                    filter: `student_id=eq.${selectedStudent.id}`
                },
                (payload) => {
                    console.log('⚡ [Realtime] Atualização de matrícula (documentos):', payload);
                    queryClient.invalidateQueries({ queryKey: ['alerts', selectedStudent.id] });
                }
            )
            .subscribe();

        // 3. Financial (Installments)
        // We listen for changes in installments related to the student's enrollments would be ideal,
        // but since we can't join filters comfortably in realtime, we rely on RLS or broader filter.
        // For efficiency, we'll listen to table changes and rely on invalidation.
        const finChannel = supabase
            .channel(`alerts-financial-${selectedStudent.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'installments'
                },
                (payload) => {
                    // This might trigger often if school has many ops, but for a parent app (RLS filtered),
                    // they should only receive events for their rows if RLS is set to 'true' for subscribing?
                    // NOTE: Supabase Realtime emits events if the subscriber is allowed to see the row.
                    console.log('⚡ [Realtime] Atualização financeira:', payload);
                    queryClient.invalidateQueries({ queryKey: ['alerts', selectedStudent.id] });
                    queryClient.invalidateQueries({ queryKey: ['financials'] }); // Also refresh financial list
                }
            )
            .subscribe();

        return () => {
            console.log('🔌 [Realtime] Desconectando...');
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(docChannel);
            supabase.removeChannel(finChannel);
        };
    }, [selectedStudent?.id, queryClient, supabase]);

    const { data: alerts = { documents: 0, messages: 0, financial: 0, total: 0 }, isLoading } = useQuery({
        queryKey: ['alerts', selectedStudent?.id],
        queryFn: async (): Promise<Alerts> => {
            if (!selectedStudent?.id) return { documents: 0, messages: 0, financial: 0, total: 0 };

            // 1. Check Documents
            let docCount = 0;
            try {
                // Fetch enrollment
                const { data: enrollment } = await supabase
                    .from('enrollments')
                    .select('details, school_id')
                    .eq('student_id', selectedStudent.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (enrollment) {
                    // Fetch templates
                    let templates = DEFAULT_TEMPLATES;
                    if (enrollment.school_id) {
                        const { data: settingsData } = await supabase
                            .from('app_settings')
                            .select('value')
                            .eq('school_id', enrollment.school_id)
                            .eq('key', 'enrollment_docs_template')
                            .maybeSingle();

                        if (settingsData?.value) {
                            try {
                                const val = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
                                if (Array.isArray(val)) templates = val;
                            } catch (e) { }
                        }
                    }

                    const uploadedDocs = enrollment.details?.documents || {};

                    // Count rejected or missing required
                    const checkedKeys = new Set<string>();

                    templates.forEach((template: any) => {
                        checkedKeys.add(template.id);
                        const doc = uploadedDocs[template.id];
                        const status = doc?.status || 'missing';

                        if (status === 'rejected') docCount++;
                        else if (status === 'missing' && template.required) docCount++;
                    });

                    // Check extra docs that are rejected
                    Object.keys(uploadedDocs).forEach(key => {
                        if (!checkedKeys.has(key) && uploadedDocs[key].status === 'rejected') {
                            docCount++;
                        }
                    });
                }
            } catch (e) {
                console.error("Error checking document alerts", e);
            }

            // 2. Check Messages
            let msgCount = 0;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { count, error } = await supabase
                        .from('communication_recipients')
                        .select('id, communication:communications!inner(school_id)', { count: 'exact' })
                        .eq('guardian_id', user.id)
                        .eq('communication.school_id', selectedStudent.school_id)
                        .is('read_at', null)
                        .eq('is_archived', false);

                    if (!error && count !== null) {
                        msgCount = count;
                    }
                }
            } catch (e) {
                console.error("Error checking message alerts", e);
            }

            // 3. Check Financial (Overdue or Pending)
            let finCount = 0;
            try {
                // Find enrollment ID for this student
                const { data: enrollment } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq('student_id', selectedStudent.id)
                    .eq('status', 'approved') // Only approved enrollments have valid billing usually
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (enrollment) {
                    // Count overdue installments
                    const today = new Date().toISOString().split('T')[0];
                    const { count } = await supabase
                        .from('installments')
                        .select('id', { count: 'exact' })
                        .eq('enrollment_id', enrollment.id)
                        .eq('status', 'overdue')
                        .lt('due_date', today); // Double check overdue logic

                    // Or count pending items that are effectively overdue
                    // For simplicity, just count 'overdue' status if the system maintains it, 
                    // or check due_date < today AND status = pending.
                    // Assuming 'overdue' status is managed by cron or application logic.
                    // If not, we should query pending + date check.

                    if (count) finCount = count;

                    // Also check for 'pending' that are past due date if status isn't auto-updated
                    const { count: pendingLate } = await supabase
                        .from('installments')
                        .select('id', { count: 'exact' })
                        .eq('enrollment_id', enrollment.id)
                        .eq('status', 'pending')
                        .lte('due_date', today); // Include TODAY in the alert

                    if (pendingLate) finCount += pendingLate;
                }
            } catch (e) {
                console.error("Error checking financial alerts", e);
            }

            return {
                documents: docCount,
                messages: msgCount,
                financial: finCount,
                total: docCount + msgCount + finCount
            };
        },
        enabled: !!selectedStudent?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes (but invalidated by realtime)
        refetchOnWindowFocus: true
    });

    // Sync App Badge (Client Side)
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
            if (alerts.total > 0) {
                // @ts-ignore - Types might be missing in older TS/Env
                navigator.setAppBadge(alerts.total).catch((e) => console.warn("Badge error", e));
            } else {
                // @ts-ignore
                navigator.clearAppBadge().catch((e) => console.warn("Badge error", e));
            }
        }
    }, [alerts.total]);

    return { alerts, isLoading };
};
