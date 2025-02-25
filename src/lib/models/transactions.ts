import type { Transaction } from '$lib/types';
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export async function getTransaction(id: number): Promise<Transaction> {
    try {
        const { data: transaction, error: err } = await supabase
            .from('transactions')
            .select(`
                id,
                uuid,
                account_id,
                operation_date,
                value_date,
                inserted_at,
                description,
                user_description,
                categories:transaction_categories!inner (
                    id,
                    transaction_id,
                    category_id,
                    subcategory_id,
                    amount,
                    category:categories!inner (
                        id,
                        name,
                        subcategories:subcategories (
                            id,
                            category_id,
                            name
                        )
                    ),
                    subcategory:subcategories (
                        id,
                        category_id,
                        name
                    )
                ),
                account:accounts!inner (
                    id,
                    bank_id,
                    account_type,
                    account_number,
                    bank:banks!inner (
                        id,
                        name
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (err || !transaction) {
            console.error('Error fetching transaction:', err);
            throw error(500, 'Failed to fetch transaction');
        }

        return transaction as unknown as Transaction;
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
        const { error: deleteError } = await supabase
            .from('transaction_categories')
            .delete()
            .eq('transaction_id', transactionId);

        if (deleteError) throw new Error('Failed to delete existing categories');

        const newCategories = categories.map(cat => ({
            transaction_id: transactionId,
            category_id: cat.categoryId,
            subcategory_id: cat.subcategoryId,
            amount: cat.amount
        }));

        const { error: insertError } = await supabase
            .from('transaction_categories')
            .insert(newCategories);

        if (insertError) throw new Error('Failed to insert new categories');
    } catch (err) {
        console.error('Error updating transaction categories:', err);
        throw error(500, 'Failed to update transaction categories');
    }
}

export async function updateTransactionDescription(
    transactionId: number,
    userDescription: string
): Promise<void> {
    try {
        const { error: err } = await supabase
            .from('transactions')
            .update({ user_description: userDescription })
            .eq('id', transactionId);

        if (err) {
            console.error('Error updating transaction description:', err);
            throw error(500, 'Failed to update transaction description');
        }
    } catch (err) {
        console.error('Error updating transaction description:', err);
        throw error(500, 'Failed to update transaction description');
    }
} 