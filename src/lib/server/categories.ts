import type { Category } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
    try {
        const { data: categories, error: err } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                subcategories:subcategories (
                    id,
                    category_id,
                    name
                )
            `);

        if (err) {
            console.error('Error fetching categories:', err);
            throw error(500, 'Failed to fetch categories');
        }

        return categories as unknown as Category[];
    } catch (err) {
        console.error('Error in getCategories:', err);
        throw error(500, 'Internal server error');
    }
} 