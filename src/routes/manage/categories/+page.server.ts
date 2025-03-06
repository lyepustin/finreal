import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export const load: PageServerLoad = async () => {
    try {
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                subcategories (
                    id,
                    name
                ),
                transaction_categories:transaction_categories (
                    id
                )
            `)
            .order('name');

        if (categoriesError) {
            throw error(500, 'Failed to fetch categories');
        }

        return { categories };
    } catch (e) {
        console.error('Error loading categories:', e);
        throw error(500, 'Failed to load categories data');
    }
};

export const actions: Actions = {
    upsertCategory: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');
        const name = formData.get('name')?.toString().trim();

        if (!name) {
            return fail(400, { error: 'Category name is required' });
        }

        try {
            if (id === '0') {
                // Insert new category
                const { error: insertError } = await supabase
                    .from('categories')
                    .insert({ name });

                if (insertError) throw insertError;
            } else {
                // Update existing category
                const { error: updateError } = await supabase
                    .from('categories')
                    .update({ name })
                    .eq('id', id);

                if (updateError) throw updateError;
            }

            // Fetch updated categories
            const { data: categories, error: fetchError } = await supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        name
                    ),
                    transaction_categories:transaction_categories (
                        id
                    )
                `)
                .order('name');

            if (fetchError) throw fetchError;

            return { categories };
        } catch (e) {
            console.error('Error upserting category:', e);
            return fail(500, { error: 'Failed to save category' });
        }
    },

    upsertSubcategory: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');
        const categoryId = formData.get('categoryId');
        const name = formData.get('name')?.toString().trim();

        if (!name || !categoryId) {
            return fail(400, { error: 'Subcategory name and category ID are required' });
        }

        try {
            if (!id) {
                // Insert new subcategory
                const { error: insertError } = await supabase
                    .from('subcategories')
                    .insert({ 
                        name,
                        category_id: categoryId 
                    });

                if (insertError) throw insertError;
            } else {
                // Update existing subcategory
                const { error: updateError } = await supabase
                    .from('subcategories')
                    .update({ name })
                    .eq('id', id);

                if (updateError) throw updateError;
            }

            // Fetch updated categories
            const { data: categories, error: fetchError } = await supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        name
                    ),
                    transaction_categories:transaction_categories (
                        id
                    )
                `)
                .order('name');

            if (fetchError) throw fetchError;

            return { categories };
        } catch (e) {
            console.error('Error upserting subcategory:', e);
            return fail(500, { error: 'Failed to save subcategory' });
        }
    },

    deleteCategory: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (!id) {
            return fail(400, { error: 'Category ID is required' });
        }

        try {
            // Check if category has any subcategories
            const { data: subcategories, error: checkSubsError } = await supabase
                .from('subcategories')
                .select('id')
                .eq('category_id', id);

            if (checkSubsError) throw checkSubsError;

            if (subcategories && subcategories.length > 0) {
                return fail(400, { error: 'Cannot delete category with subcategories' });
            }

            // Check if category has any transactions
            const { data: transactions, error: checkTransError } = await supabase
                .from('transaction_categories')
                .select('id')
                .eq('category_id', id)
                .limit(1);

            if (checkTransError) throw checkTransError;

            if (transactions && transactions.length > 0) {
                return fail(400, { error: 'Cannot delete category with associated transactions' });
            }

            // Delete category
            const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Fetch updated categories
            const { data: categories, error: fetchError } = await supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        name
                    ),
                    transaction_categories:transaction_categories (
                        id
                    )
                `)
                .order('name');

            if (fetchError) throw fetchError;

            return { categories };
        } catch (e) {
            console.error('Error deleting category:', e);
            return fail(500, { error: 'Failed to delete category' });
        }
    },

    deleteSubcategory: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (!id) {
            return fail(400, { error: 'Subcategory ID is required' });
        }

        try {
            // Check if subcategory has any transactions
            const { data: transactions, error: checkTransError } = await supabase
                .from('transaction_categories')
                .select('id')
                .eq('subcategory_id', id)
                .limit(1);

            if (checkTransError) throw checkTransError;

            if (transactions && transactions.length > 0) {
                return fail(400, { error: 'Cannot delete subcategory with associated transactions' });
            }

            // Delete subcategory
            const { error: deleteError } = await supabase
                .from('subcategories')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Fetch updated categories
            const { data: categories, error: fetchError } = await supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        name
                    ),
                    transaction_categories:transaction_categories (
                        id
                    )
                `)
                .order('name');

            if (fetchError) throw fetchError;

            return { categories };
        } catch (e) {
            console.error('Error deleting subcategory:', e);
            return fail(500, { error: 'Failed to delete subcategory' });
        }
    }
}; 