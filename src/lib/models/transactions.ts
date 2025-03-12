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
        // Validate input
        if (!transactionId || !categories || categories.length === 0) {
            throw new Error('Invalid input: transactionId and categories are required');
        }

        // Call the database function to update categories atomically
        const { error: updateError } = await supabase.rpc(
            'update_transaction_categories',
            {
                p_transaction_id: transactionId,
                p_categories: categories
            }
        );

        if (updateError) {
            console.error('Error updating transaction categories:', updateError);
            throw new Error('Failed to update transaction categories');
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