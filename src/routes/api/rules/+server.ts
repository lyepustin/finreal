import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
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

        const body = await request.json();
        const { pattern, category_id, subcategory_id } = body;

        if (!pattern || !category_id) {
            return json({
                success: false,
                error: 'Pattern and category are required'
            }, { status: 400 });
        }

        // Create new rule
        const { data: rule, error: createError } = await supabase
            .from('transaction_rules')
            .insert({
                pattern: pattern.toString(),
                category_id: Number(category_id),
                subcategory_id: subcategory_id ? Number(subcategory_id) : null,
                user_id: session.user.id
            })
            .select()
            .single();

        if (createError) throw createError;

        return json({
            success: true,
            data: rule
        });
    } catch (error) {
        console.error('Error creating rule:', error);
        return json({
            success: false,
            error: 'Failed to create rule'
        }, { status: 500 });
    }
}; 