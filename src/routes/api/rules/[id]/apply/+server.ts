import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, locals: { supabase } }) => {
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

        const ruleId = params.id;

        if (!ruleId) {
            return json({
                success: false,
                error: 'Rule ID is required'
            }, { status: 400 });
        }

        // Call the apply_rule function
        const { data: rpcResult, error: dbError } = await supabase
            .rpc('apply_rule', { rule_id: parseInt(ruleId) });

        if (dbError) throw dbError;

        // Extract affected_count directly from the first result
        const affectedCount = rpcResult?.[0]?.affected_count || 0;

        return json({
            success: true,
            data: {
                affectedCount
            }
        });
    } catch (error) {
        console.error('Error applying rule:', error);
        return json({
            success: false,
            error: 'Failed to apply rule'
        }, { status: 500 });
    }
}; 