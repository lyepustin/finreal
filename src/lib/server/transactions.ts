import type { Transaction } from '$lib/types';
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function getTransaction(id: number): Promise<Transaction | null> {
    try {
        const { data: transaction, error: err } = await supabase
            .from('transactions')
            .select(`
                id,
                description,
                user_description,
                operation_date,
                categories:transaction_categories (
                    amount,
                    category:categories (
                        id,
                        name
                    ),
                    subcategory:subcategories (
                        id,
                        name
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (err) {
            console.error('Error fetching transaction:', err);
            throw error(500, 'Failed to fetch transaction');
        }

        return transaction;
    } catch (err) {
        console.error('Error in getTransaction:', err);
        throw error(500, 'Internal server error');
    }
}

export async function updateTransactionCategories(id: number, categories: { categoryId: number; subcategoryId: number | null; amount: number }[]) {
    try {
        // First delete existing categories
        const { error: deleteError } = await supabase
            .from('transaction_categories')
            .delete()
            .eq('transaction_id', id);

        if (deleteError) {
            throw deleteError;
        }

        // Then insert new categories
        const { error: insertError } = await supabase
            .from('transaction_categories')
            .insert(
                categories.map(cat => ({
                    transaction_id: id,
                    category_id: cat.categoryId,
                    subcategory_id: cat.subcategoryId,
                    amount: cat.amount
                }))
            );

        if (insertError) {
            throw insertError;
        }
    } catch (err) {
        console.error('Error updating transaction categories:', err);
        throw error(500, 'Failed to update transaction categories');
    }
} 