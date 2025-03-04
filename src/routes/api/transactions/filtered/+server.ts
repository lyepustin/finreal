import { json } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import { measureAsync } from '$lib/utils/performance';

export const GET: RequestHandler = async ({ url }) => {
    return await measureAsync('get_filtered_transactions', async () => {
        try {
            // Get filter parameters from URL
            const dateFrom = url.searchParams.get('dateFrom');
            const dateTo = url.searchParams.get('dateTo');
            const typeValue = url.searchParams.get('type') || 'all';
            const sortColumn = url.searchParams.get('sort.column') || 'operation_date';
            const sortDirection = url.searchParams.get('sort.direction') || 'desc';
            const page = parseInt(url.searchParams.get('page') || '1');
            const pageSize = parseInt(url.searchParams.get('pageSize') || '30');
            
            // Get category IDs if present
            const categoryIds = url.searchParams.getAll('categories.selected[]').map(id => parseInt(id));

            // Query the database using the new function
            const { data, error } = await supabase.rpc('get_filtered_transactions', {
                date_from: dateFrom || null,
                date_to: dateTo || null,
                type_filter: typeValue,
                category_ids: categoryIds.length > 0 ? categoryIds : null,
                sort_column: sortColumn,
                sort_direction: sortDirection,
                page_number: page,
                page_size: pageSize
            });

            if (error) {
                console.error('Supabase RPC error:', error);
                throw error;
            }

            // Extract total count and transactions from the result
            const { total_count, transactions } = data?.[0] || { total_count: 0, transactions: [] };

            return json({
                success: true,
                data: {
                    transactions: transactions || [],
                    totalCount: total_count || 0,
                    currentPage: page,
                    totalPages: Math.ceil((total_count || 0) / pageSize)
                }
            });
        } catch (error) {
            console.error('Error in get_filtered_transactions:', error);
            return json({
                success: false,
                error: 'Failed to fetch transactions'
            }, { status: 500 });
        }
    });
}; 