import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { measureAsync } from '$lib/utils/performance';

interface TotalsResult {
    total_income: number;
    total_expenses: number;
    net_amount: number;
}

export const GET: RequestHandler = async ({ locals: { supabase }, url }) => {
    return await measureAsync('get_transactions_totals', async () => {
        try {
            // Get filter parameters from URL
            const dateFrom = url.searchParams.get('dateFrom');
            const dateTo = url.searchParams.get('dateTo');
            const typeValue = url.searchParams.get('type') || 'all';
            const categoryIds = url.searchParams.getAll('categories[]').map(id => parseInt(id));
            const isNegative = url.searchParams.get('isNegative') === 'true';
            const searchTerm = url.searchParams.get('searchTerm') || null;

            // Query the database for totals using Supabase rpc call
            const { data, error } = await supabase.rpc<TotalsResult[]>('get_transactions_totals', {
                date_from: dateFrom ? dateFrom : null,
                date_to: dateTo ? dateTo : null,
                type_filter: typeValue,
                category_ids: categoryIds.length > 0 ? categoryIds : null,
                is_negative: isNegative,
                search_term: searchTerm
            });

            if (error) {
                console.error('Error in get_transactions_totals:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                return json({
                    success: true,
                    data: {
                        totalIncome: 0,
                        totalExpenses: 0,
                        netAmount: 0
                    }
                });
            }

            const totals = data[0];
            return json({
                success: true,
                data: {
                    totalIncome: Number(totals.total_income || 0),
                    totalExpenses: Number(totals.total_expenses || 0),
                    netAmount: Number(totals.net_amount || 0)
                }
            });
        } catch (error) {
            console.error('Error fetching transaction totals:', error);
            return json({
                success: false,
                error: 'Failed to fetch transaction totals'
            }, { status: 500 });
        }
    });
}; 