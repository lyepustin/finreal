import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleTransactionCategoriesUpdate } from '$lib/api/transactions';

export const PUT: RequestHandler = async ({ params, request }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    const { categories } = await request.json();
    return json(await handleTransactionCategoriesUpdate(transactionId, categories));
}; 