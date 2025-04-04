import type { Transaction } from '$lib/types';
import { error } from '@sveltejs/kit';

export async function getTransaction(id: number): Promise<Transaction> {
    try {
        const response = await fetch(`/api/transactions/${id}`);

        if (!response.ok) {
            console.error('Error fetching transaction:', response.statusText);
            throw error(500, 'Failed to fetch transaction');
        }

        const transaction = await response.json();
        return transaction as Transaction;
    } catch (err) {
        console.error('Error in getTransaction:', err);
        throw error(500, 'Internal server error');
    }
}

export async function updateTransactionCategories(
    transactionId: number,
    categories: { categoryId: number; subcategoryId: number | null; amount: number }[]
): Promise<void> {
    try {
        // Validate input
        if (!transactionId || !categories || categories.length === 0) {
            throw new Error('Invalid input: transactionId and categories are required');
        }

        const response = await fetch(`/api/transactions/${transactionId}/categories`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ categories })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || await response.text() || response.statusText;
            console.error('Error updating transaction categories:', errorMessage);
            throw new Error(errorMessage);
        }
    } catch (err) {
        console.error('Error updating transaction categories:', err);
        throw error(500, err instanceof Error ? err.message : 'Failed to update transaction categories');
    }
}

export async function updateTransactionDescription(
    transactionId: number,
    userDescription: string
): Promise<void> {
    try {
        const response = await fetch(`/api/transactions/${transactionId}/description`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_description: userDescription })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || await response.text() || response.statusText;
            console.error('Error updating transaction description:', errorMessage);
            throw new Error(errorMessage);
        }
    } catch (err) {
        console.error('Error updating transaction description:', err);
        throw error(500, err instanceof Error ? err.message : 'Failed to update transaction description');
    }
} 