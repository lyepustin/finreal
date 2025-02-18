import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { measureAsync } from '$lib/utils/performance'

export const PATCH: RequestHandler = async ({ params, request, locals: { supabase } }) => {
    const { user_description } = await request.json()
    
    const { error } = await measureAsync('update-transaction-description', () =>
        supabase
            .from('transactions')
            .update({ user_description })
            .eq('id', params.id)
    )

    if (error) {
        return json({ error: error.message }, { status: 400 })
    }

    return json({ success: true })
} 