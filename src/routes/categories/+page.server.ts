import type { PageServerLoad } from './$types'
import { measureAsync } from '$lib/utils/performance';
import type { CategoryFilters } from '$lib/types/filters';
import { getDefaultMonthDateRange } from '$lib/utils/dates';

const PAGE_SIZE = 18;

function parseFilters(searchParams: URLSearchParams): CategoryFilters {
    // Get dates from URL parameters
    const fromParam = searchParams.get('dateFrom');
    const toParam = searchParams.get('dateTo');

    // Get default date range for current month
    const defaultDateRange = getDefaultMonthDateRange();
    
    const dateRange = { 
        from: fromParam || defaultDateRange.from,
        to: toParam || defaultDateRange.to
    };
    
    return {
        dateRange
    };
}

export const load: PageServerLoad = async ({ depends, locals: { supabase }, url }) => {
    depends('supabase:transactions')

    return await measureAsync('categories-page-load', async () => {
        const filters = parseFilters(url.searchParams);

        // Start with base query for categories with their transactions
        const query = supabase
            .from('categories')
            .select(`
                id,
                name,
                transactions:transaction_categories!inner (
                    id,
                    amount,
                    transaction:transactions!inner (
                        id,
                        operation_date,
                        description,
                        user_description
                    )
                ),
                subcategories (
                    id,
                    name,
                    transactions:transaction_categories!inner (
                        id,
                        amount,
                        transaction:transactions!inner (
                            operation_date
                        )
                    )
                )
            `);

        // Apply date range filter to transactions
        if (filters.dateRange.from) {
            query.gte('transactions.transaction.operation_date', filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            query.lte('transactions.transaction.operation_date', filters.dateRange.to);
        }

        // Apply the same date range filter to subcategory transactions
        if (filters.dateRange.from) {
            query.gte('subcategories.transactions.transaction.operation_date', filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            query.lte('subcategories.transactions.transaction.operation_date', filters.dateRange.to);
        }

        // Fetch the data
        const { data: categoriesData, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return {
                error: 'Failed to fetch categories data',
                categoriesData: [],
                totalPages: 0,
                currentPage: 1,
                categories: [],
                filters
            };
        }

        // Process and aggregate the data
        const processedCategories = categoriesData?.map(category => {
            // Process subcategories first
            const subcategories = (category.subcategories || []).map(sub => {
                const subTotal = Math.round((sub.transactions || []).reduce((sum, tc) => sum + (tc.amount || 0), 0));
                const transactionCount = (sub.transactions || []).length;
                return {
                    id: sub.id,
                    name: sub.name,
                    total: subTotal,
                    transactionCount
                };
            }).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

            // Calculate category total from subcategories (keep decimals for main total)
            const total = subcategories.reduce((sum, sub) => sum + sub.total, 0);
            const transactionCount = subcategories.reduce((sum, sub) => sum + sub.transactionCount, 0);

            return {
                id: category.id,
                name: category.name,
                total,
                transactionCount,
                subcategories
            };
        }) || [];

        // Sort categories: first income (highest to lowest), then expenses (highest to lowest)
        const sortedCategories = processedCategories.sort((a, b) => {
            // If both are income or both are expenses, sort by absolute value
            if ((a.total >= 0 && b.total >= 0) || (a.total < 0 && b.total < 0)) {
                return Math.abs(b.total) - Math.abs(a.total);
            }
            // If one is income and one is expense, income comes first
            return b.total - a.total;
        });

        // Handle pagination
        const totalPages = Math.ceil(sortedCategories.length / PAGE_SIZE);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const paginatedCategories = sortedCategories.slice(start, end);

        return {
            categoriesData: paginatedCategories,
            totalPages,
            currentPage: page,
            categories: categoriesData ?? [], // For category list
            filters
        };
    });
} 