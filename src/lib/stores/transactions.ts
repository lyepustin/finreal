import { supabase } from '$lib/db/supabase'

async function updateTransactionDescription(id: number, description: string) {
    const response = await fetch(`/api/transactions/${id}/description`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Error updating transaction description:', error);
        throw new Error('Failed to update transaction description');
    }
}

async function updateTransactionCategories(id: number, categories: { categoryId: number; subcategoryId: number | null; amount: number }[]) {
    const response = await fetch(`/api/transactions/${id}/categories`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Error updating transaction categories:', error);
        throw new Error('Failed to update transaction categories');
    }
}

export const transactions = {
    updateTransactionDescription,
    updateTransactionCategories
}; 