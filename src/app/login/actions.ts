'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'E-mail e senha são obrigatórios.' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    if (data?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()

        if (profile?.role !== 'PARENT') {
            await supabase.auth.signOut()
            return { error: 'Acesso negado. Este aplicativo é exclusivo para pais e responsáveis.' }
        }
    }

    revalidatePath('/', 'layout')
    redirect('/home')
}
