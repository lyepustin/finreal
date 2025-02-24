import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';

export const load: PageServerLoad = async ({ params }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    try {
        // Fetch transaction with its categories
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select(`
                *,
                categories:transaction_categories (
                    amount,
                    category:categories (
                        id,
                        name,
                        subcategories (
                            id,
                            name
                        )
                    ),
                    subcategory:subcategories (
                        id,
                        name
                    )
                )
            `)
            .eq('id', transactionId)
            .single();

        if (transactionError) {
            console.error('Error fetching transaction:', transactionError);
            throw error(500, 'Failed to fetch transaction');
        }

        if (!transaction) {
            throw error(404, 'Transaction not found');
        }

        // Fetch all categories for the dropdown
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                subcategories (
                    id,
                    name
                )
            `)
            .order('name');

        if (categoriesError) {
            console.error('Error fetching categories:', categoriesError);
            throw error(500, 'Failed to fetch categories');
        }

        return {
            transaction,
            categories: categories || []
        };
    } catch (err) {
        console.error('Error in load function:', err);
        throw error(500, 'Internal server error');
    }
}; 