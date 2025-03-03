import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const period = url.searchParams.get('period') || 'month';
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const count = parseInt(url.searchParams.get('count') || '5');

        if (period !== 'month' && period !== 'year') {
            return json({ error: 'Invalid period. Must be month or year.' }, { status: 400 });
        }

        if (isNaN(offset) || offset < 0) {
            return json({ error: 'Invalid offset. Must be a non-negative number.' }, { status: 400 });
        }

        if (isNaN(count) || count <= 0) {
            return json({ error: 'Invalid count. Must be a positive number.' }, { status: 400 });
        }

        // Call the Supabase function with offset parameter
        const { data, error } = await supabase
            .rpc('get_financial_summary', {
                period_type: period,
                num_periods: count,
                period_offset: offset
            });

        if (error) {
            console.error('Error fetching financial summary:', error);
            return json({ error: 'Failed to fetch financial data' }, { status: 500 });
        }

        // Transform the data to ensure categories is always an array
        const transformedData = data?.map(item => ({
            ...item,
            categories: Array.isArray(item.categories) ? item.categories : []
        })) || [];

        return json({
            chartData: transformedData
        });

    } catch (error) {
        console.error('Error in financial data endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}; 