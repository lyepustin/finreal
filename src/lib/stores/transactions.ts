import { supabase } from '$lib/db/supabase'

async function updateTransactionDescription(id: number, description: string) {
    const { error } = await supabase
        .from('transactions')
        .update({ user_description: description })
        .eq('id', id);

    if (error) {
        console.error('Error updating transaction description:', error);
        throw new Error('Failed to update transaction description');
    }
}

async function updateTransactionCategories(id: number, categories: { categoryId: number; subcategoryId: number | null; amount: number }[]) {
    // Start a transaction
    const { error: deleteError } = await supabase
        .from('transaction_categories')
        .delete()
        .eq('transaction_id', id);

    if (deleteError) {
        console.error('Error deleting old categories:', deleteError);
        throw new Error('Failed to update transaction categories');
    }

    // Insert new categories
    const { error: insertError } = await supabase
        .from('transaction_categories')
        .insert(categories.map(cat => ({
            transaction_id: id,
            category_id: cat.categoryId,
            subcategory_id: cat.subcategoryId,
            amount: cat.amount
        })));

    if (insertError) {
        console.error('Error inserting new categories:', insertError);
        throw new Error('Failed to update transaction categories');
    }
}

export const transactions = {
    updateTransactionDescription,
    updateTransactionCategories
}; 