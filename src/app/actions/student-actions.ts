'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateStudentHealth(studentId: string, healthInfo: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Optional: Verify if the user is linked to the student via enrollment/parent_id
    // For now maximizing speed, relying on RLS if configured or optimistically assuming valid studentId from context

    const { error } = await supabase
        .from('students')
        .update({ health_info: healthInfo })
        .eq('id', studentId);

    if (error) {
        console.error('Error updating student health:', error);
        throw new Error('Failed to update health info');
    }

    revalidatePath('/perfil/aluno');
    return { success: true };
}

export async function getStudentHealth(studentId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('students')
        .select('health_info')
        .eq('id', studentId)
        .single();

    if (error) {
        console.error('Error fetching student health:', error);
        return null;
    }

    return data?.health_info || {};
}

export async function getStudentFullProfile(studentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Fetch Student via Guardian Link (Secure & Consistent with Client)
    const { data: guardianLink, error: linkError } = await supabase
        .from('student_guardians')
        .select(`
            student:students!inner(
                *,
                school:schools(name)
            )
        `)
        .eq('guardian_id', user.id)
        .eq('student_id', studentId)
        .single();

    if (linkError || !guardianLink?.student) {
        console.error('Error fetching student via guardian link:', linkError);
        return null;
    }

    const student = guardianLink.student;

    // 2. Fetch All Enrollments (to check finance across all history)
    const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id, status, contract_signed_at, academic_year, details, school_id, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (enrollmentError) {
        console.warn('Error fetching enrollments:', enrollmentError);
    }

    const latestEnrollment = enrollments?.[0] || null;

    // 3. Determine Financial Status (Check ALL enrollments)
    let financialStatus = 'ok';
    if (enrollments && enrollments.length > 0) {
        try {
            const enrollmentIds = enrollments.map(e => e.id);
            console.log('🔍 [Profile] Checking Finance for Enrollments:', enrollmentIds);

            // Fetch ALL installments (plain array, lighter payload)
            const { data: installments } = await supabase
                .from('installments')
                .select('id, due_date, status')
                .in('enrollment_id', enrollmentIds);

            if (installments) {
                console.log(`🔍 [Profile] Found ${installments.length} installments.`);

                // Compare dates using Objects to be safe against Timezones/Formats
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Midnight today

                console.log('📅 [Profile] Comparison Date (Today Midnight):', today.toISOString());

                const hasDebt = installments.some(item => {
                    const isOverdue = item.status === 'overdue';

                    let isPendingLate = false;
                    if (item.status === 'pending' && item.due_date) {
                        // Parse due_date. Append T00:00:00 if simple date string to prevent UTC shift
                        // OR just split YYYY-MM-DD and construct local date.
                        // Best way: treat the string YYYY-MM-DD as "Local Date" -> noon to be safe
                        const dueDate = new Date(item.due_date + (item.due_date.includes('T') ? '' : 'T12:00:00'));
                        dueDate.setHours(0, 0, 0, 0); // Midnight of due date

                        isPendingLate = dueDate < today;

                        if (isPendingLate) {
                            console.log(`⚠️ [Profile] Late Pending detected. Due: ${dueDate.toISOString()} < Today: ${today.toISOString()}`);
                        }
                    }

                    if (isOverdue || isPendingLate) {
                        console.log(`⚠️ [Profile] FOUND DEBT! Item: ${item.id}, Status: ${item.status}, Due: ${item.due_date}`);
                    }
                    return isOverdue || isPendingLate;
                });

                if (hasDebt) financialStatus = 'overdue';
            }
        } catch (e) {
            console.error('Error checking financial status', e);
        }
    }

    // 4. Determine Document Status (Check latest enrollment primarily, or all?)
    // Usually documents are per enrollment year. Let's check the latest one for the "Main" status.
    let documentsStatus = 'ok';
    if (latestEnrollment) {
        const docs = latestEnrollment.details?.documents || {};
        const hasRejected = Object.values(docs).some((d: any) => d.status === 'rejected');
        if (hasRejected) documentsStatus = 'rejected';
    }

    return {
        ...student,
        financialStatus,
        documentsStatus,
        currentEnrollment: latestEnrollment
    };
}
