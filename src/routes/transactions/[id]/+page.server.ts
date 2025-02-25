import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import * as TransactionModel from '$lib/models/transactions';
import * as CategoryModel from '$lib/server/categories';

export const load: PageServerLoad = async ({ params }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    try {
        const [transaction, categories] = await Promise.all([
            TransactionModel.getTransaction(transactionId),
            CategoryModel.getCategories()
        ]);
        
        if (!transaction) {
            throw error(404, 'Transaction not found');
        }

        return {
            transaction,
            categories
        };
    } catch (err) {
        console.error('Error in load function:', err);
        throw error(500, 'Internal server error');
    }
}; 