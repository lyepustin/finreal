import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/db/supabase';
import type { Category } from '$lib/types';

export const GET: RequestHandler = async () => {
    try {
        const { data, error } = await supabase
            .rpc('get_categories_with_subcategories');

        if (error) {
            console.error('Error fetching categories:', error);
            return json({ 
                categories: [], 
                error: 'Failed to fetch categories' 
            }, { status: 500 });
        }

        // Transform the data to match our Category type
        const categories: Category[] = data.map(cat => ({
            id: cat.id,
            name: cat.name,
            subcategories: cat.subcategories
        }));

        return json({
            categories
        });

    } catch (error) {
        console.error('Error in categories endpoint:', error);
        return json({ 
            categories: [], 
            error: 'Internal server error' 
        }, { status: 500 });
    }
} 