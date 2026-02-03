'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useStudent } from '@/contexts/StudentContext';

export const useAppSettings = (key: string, defaultValue: string = '') => {
    const [value, setValue] = useState(defaultValue);
    const [loading, setLoading] = useState(true);
    const { selectedStudent } = useStudent();
    const supabase = createClient();

    useEffect(() => {
        // We need the school_id. In the original, it came from AuthContext.
        // Here we might need to fetch it from the student's profile or assumption.
        // For now, let's assume valid user session.
        // Actually, app_settings are usually school-wide. 
        // We'll try to fetch based on the student's linked school if available, 
        // or just rely on the user's org if multi-tenant.
        // Looking at the original code, it uses `currentSchool.id`. 
        // In this new app, we haven't ported the full SchoolContext yet.
        // We will do a safe fetch if possible.

        // Quickest path: If we are logged in, we likely have metadata.
        // But for this hook, let's just implement the basic fetch based on the student's school_id if present.

        const fetchSetting = async () => {
            if (!selectedStudent?.school_id) return;

            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('school_id', selectedStudent.school_id)
                    .eq('key', key)
                    .maybeSingle();

                if (data) {
                    setValue(data.value);
                }
            } catch (err) {
                console.error(`Error fetching setting ${key}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchSetting();
    }, [key, selectedStudent]);

    return { value, loading };
};
