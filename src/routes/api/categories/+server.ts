import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals: { supabase } }) => {
    try {
        const { data: categories, error } = await supabase
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

        if (error) {
            console.error('Error fetching categories:', error);
            return json({ 
                success: false,
                error: 'Failed to fetch categories'
            }, { status: 500 });
        }

        return json({
            success: true,
            categories: categories || []
        });
    } catch (error) {
        console.error('Error in categories endpoint:', error);
        return json({ 
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}; 