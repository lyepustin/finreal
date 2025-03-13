import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    try {
        const { categories } = await request.json();
        
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            throw error(400, 'Invalid categories data');
        }

        // Call the RPC function to update categories
        const { error: updateError } = await supabase.rpc(
            'update_transaction_categories',
            { 
                p_transaction_id: transactionId,
                p_categories: categories
            }
        );

        if (updateError) {
            console.error('Error updating transaction categories:', updateError);
            
            // Handle specific error cases
            if (updateError.code === '23505') {
                throw error(400, 'Cannot assign the same category and subcategory combination multiple times to a transaction');
            }
            
            // Handle other database errors with more specific messages
            if (updateError.code?.startsWith('23')) {
                throw error(400, updateError.message || 'Database constraint violation');
            }
            
            throw error(500, `Failed to update transaction categories: ${updateError.message}`);
        }

        return json({ success: true });
    } catch (err) {
        console.error('Error in categories update endpoint:', err);
        if (err instanceof Error) {
            // Pass through any specific error messages we've already created
            if ('status' in err && typeof err.status === 'number') {
                throw err;
            }
            throw error(500, err.message);
        }
        throw error(500, 'Internal server error');
    }
}; 