import { error } from '@sveltejs/kit';
import * as TransactionModel from '$lib/models/transactions';

export async function handleTransactionDescriptionUpdate(
    transactionId: number,
    userDescription: string
): Promise<{ success: boolean }> {
    try {
        await TransactionModel.updateTransactionDescription(transactionId, userDescription);
        return { success: true };
    } catch (err) {
        console.error('Error in handleTransactionDescriptionUpdate:', err);
        throw error(500, 'Internal server error');
    }
}

export async function handleTransactionCategoriesUpdate(
    transactionId: number,
    categories: { categoryId: number; subcategoryId: number | null; amount: number }[]
): Promise<{ success: boolean }> {
    try {
        await TransactionModel.updateTransactionCategories(transactionId, categories);
        return { success: true };
    } catch (err) {
        console.error('Error in handleTransactionCategoriesUpdate:', err);
        throw error(500, 'Internal server error');
    }
} 