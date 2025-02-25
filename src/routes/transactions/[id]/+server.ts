import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { handleTransactionDescriptionUpdate } from '$lib/api/transactions'

export const PATCH: RequestHandler = async ({ params, request }) => {
    const transactionId = parseInt(params.id)
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID')
    }

    const { user_description } = await request.json()
    return json(await handleTransactionDescriptionUpdate(transactionId, user_description))
} 