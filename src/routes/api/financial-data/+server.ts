import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const period = url.searchParams.get('period') || 'month';
        if (period !== 'month' && period !== 'year') {
            return json({ error: 'Invalid period. Must be month or year.' }, { status: 400 });
        }

        // Call the Supabase function directly
        const { data, error } = await supabase
            .rpc('get_financial_summary', {
                period_type: period,
                num_periods: 5
            });

        if (error) {
            console.error('Error fetching financial summary:', error);
            return json({ error: 'Failed to fetch financial data' }, { status: 500 });
        }

        return json({
            chartData: data || []
        });

    } catch (error) {
        console.error('Error in financial data endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}; 