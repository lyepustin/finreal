import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateTransactionCategories } from '$lib/server/transactions';

export const PUT: RequestHandler = async ({ params, request }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    const { categories } = await request.json();

    try {
        await updateTransactionCategories(transactionId, categories);
        return json({ success: true });
    } catch (err) {
        console.error('Error in PUT handler:', err);
        throw error(500, 'Internal server error');
    }
}; 