import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals: { supabase } }) => {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Get rules for categories via Supabase
        const { data, error } = await supabase
            .from('transaction_rules')
            .select(`
                id,
                pattern,
                category_id,
                subcategory_id,
                category:categories(name)
            `)
            .eq('user_id', session.user.id)
            .order('pattern');

        if (error) {
            throw error;
        }

        // Transform the data to match the expected format
        const formattedData = data.map(rule => ({
            id: rule.id,
            category_id: rule.category_id,
            pattern: rule.pattern,
            category_name: rule.category?.name || 'Unknown'
        }));
        
        return json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error fetching category rules:', error);
        return json({
            success: false,
            error: 'Failed to fetch category rules'
        }, { status: 500 });
    }
}; 