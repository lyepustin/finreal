import { json } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import { measureAsync } from '$lib/utils/performance';
import type { CategoryTotal, CategoryTotalsResponse } from './index';

export const GET: RequestHandler = async ({ url }) => {
    return await measureAsync('get_category_totals', async () => {
        try {
            // Get filter parameters from URL
            const dateFrom = url.searchParams.get('dateFrom');
            const dateTo = url.searchParams.get('dateTo');
            const typeValue = url.searchParams.get('type') || 'all';
            const searchTerm = url.searchParams.get('searchTerm') || null;

            // Query the database for totals using Supabase rpc call
            const { data, error } = await supabase.rpc('get_category_totals', {
                date_from: dateFrom ? dateFrom : null,
                date_to: dateTo ? dateTo : null,
                type_filter: typeValue,
                search_term: searchTerm
            });

            if (error) {
                console.error('Error in get_category_totals:', error);
                throw error;
            }

            return json({
                success: true,
                data: data as CategoryTotal[] || []
            } as CategoryTotalsResponse);
        } catch (error) {
            console.error('Error fetching category totals:', error);
            return json({
                success: false,
                error: 'Failed to fetch category totals'
            } as CategoryTotalsResponse, { status: 500 });
        }
    });
}; 