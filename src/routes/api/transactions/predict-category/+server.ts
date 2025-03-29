import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { predictTransactionCategory } from '$lib/services/openai';
import type { Category } from '$lib/types';

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
    try {
        const { transactionDescription } = await request.json();
        
        if (!transactionDescription) {
            return json({
                success: false,
                error: 'Transaction description is required'
            }, { status: 400 });
        }

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }
        
        // Get all categories with subcategories
        const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select(`
                id, 
                name,
                user_id,
                subcategories (
                    id,
                    category_id,
                    name
                )
            `)
            .eq('user_id', session.user.id)
            .order('name');
        
        if (categoriesError) {
            throw categoriesError;
        }
        
        // Get rules
        const { data: rulesData, error: rulesError } = await supabase
            .from('transaction_rules')
            .select(`
                id,
                pattern,
                category_id,
                subcategory_id
            `)
            .eq('user_id', session.user.id)
            .order('category_id');
        
        if (rulesError) {
            throw rulesError;
        }
        
        // Format categories properly
        const categories = categoriesData as Category[];
        
        // Format rules
        const rules = rulesData.map(rule => ({
            categoryId: rule.category_id,
            rule: rule.pattern
        }));
        
        // Call the OpenAI service to predict the category
        const prediction = await predictTransactionCategory(
            transactionDescription,
            categories,
            rules
        );
        
        return json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Error predicting transaction category:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to predict category'
        }, { status: 500 });
    }
}; 