import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    try {
        const { user_description } = await request.json();
        
        if (typeof user_description !== 'string') {
            throw error(400, 'Invalid description data');
        }

        // Update the transaction description
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ user_description })
            .eq('id', transactionId);

        if (updateError) {
            console.error('Error updating transaction description:', updateError);
            throw error(500, 'Failed to update transaction description: ' + updateError.message);
        }

        return json({ success: true });
    } catch (err) {
        console.error('Error in description update endpoint:', err);
        if (err instanceof Error) {
            throw error(500, err.message);
        }
        throw error(500, 'Internal server error');
    }
}; 