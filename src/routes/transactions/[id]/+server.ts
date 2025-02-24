import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { supabase } from '$lib/supabase'

export const PATCH: RequestHandler = async ({ params, request }) => {
    const transactionId = parseInt(params.id)
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID')
    }

    const { user_description } = await request.json()

    try {
        const { error: err } = await supabase
            .from('transactions')
            .update({ user_description })
            .eq('id', transactionId)

        if (err) {
            console.error('Error updating transaction:', err)
            throw error(500, 'Failed to update transaction')
        }

        return json({ success: true })
    } catch (err) {
        console.error('Error in PATCH handler:', err)
        throw error(500, 'Internal server error')
    }
} 