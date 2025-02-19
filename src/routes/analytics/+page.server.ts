import type { PageServerLoad, Actions } from './$types'
import { measureAsync } from '$lib/utils/performance';

// Constants
const DEFAULT_FROM_DATE = '2024-01-01';
const DEFAULT_TO_DATE = '2024-12-31';
const TRANSFERS_CATEGORY_NAME = 'transfers ♻️';

interface TransactionData {
    date: string;
    amount: number;
}

interface ChartDataPoint {
    period: string;
    income: number;
    expenses: number;
}

// Helper function to group transactions by time period
function groupTransactionsByPeriod(data: TransactionData[], period: 'month' | 'week'): ChartDataPoint[] {
    const groups = new Map<string, ChartDataPoint>();
    
    data.forEach(row => {
        const date = new Date(row.date);
        let key;
        
        if (period === 'month') {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
            // Get ISO week number
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
            const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        }
        
        if (!groups.has(key)) {
            groups.set(key, {
                period: key,
                income: 0,
                expenses: 0
            });
        }
        
        const group = groups.get(key);
        if (row.amount >= 0) {
            group.income += row.amount;
        } else {
            group.expenses += Math.abs(row.amount);
        }
    });
    
    return Array.from(groups.values())
        .sort((a, b) => a.period.localeCompare(b.period));
}

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
    depends('supabase:analytics')

    return await measureAsync('analytics-page-load', async () => {
        console.log('Starting initial load...');
        
        // Get categories first to exclude transfers
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name')
            .order('name');

        console.log('Categories loaded:', categories);

        const transfersCategoryId = categories?.find(c => c.name === TRANSFERS_CATEGORY_NAME)?.id;
        console.log('Transfers category ID:', transfersCategoryId);

        // Start building the query
        let query = supabase
            .from('transaction_categories')
            .select(`
                amount,
                transaction:transactions!inner (
                    operation_date
                )
            `)
            .gte('transactions.operation_date', DEFAULT_FROM_DATE)
            .lte('transactions.operation_date', DEFAULT_TO_DATE);

        // Only exclude transfers if we found the transfers category
        if (transfersCategoryId) {
            query = query.neq('category_id', transfersCategoryId);
        }

        const { data: transactionData } = await query;
        console.log('Amount of raw transaction data:', transactionData?.length);

        // Transform data for the chart
        const chartData = groupTransactionsByPeriod(
            transactionData?.map(t => ({
                date: t.transaction.operation_date,
                amount: t.amount
            })) || [],
            'month'
        );
        console.log('Amount of transaction data before transformation:', transactionData?.length);
        console.log('Transformed chart data:', JSON.stringify(chartData, null, 2));

        return {
            chartData,
            categories: categories?.filter(c => c.id !== transfersCategoryId) || [],
            defaultFromDate: DEFAULT_FROM_DATE,
            defaultToDate: DEFAULT_TO_DATE
        };
    });
}

interface FilterOptions {
    type: { value: 'all' | 'income' | 'expense' };
    categories: { selected: string[]; isNegative: boolean };
    subcategories: { selected: string[] };
    dateRange: { from?: string; to?: string };
    search: { value: string; isNegative: boolean };
    period: { value: 'month' | 'week' };
}

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        return await measureAsync('analytics-filter-action', async () => {
            console.log('Starting filter action...');
            
            const formData = await request.formData();
            const filters: FilterOptions = JSON.parse(formData.get('filters')?.toString() || '{}');
            console.log('Applied filters:', filters);

            // Get categories to exclude transfers
            const { data: categories } = await supabase
                .from('categories')
                .select('id, name')
                .order('name');

            const transfersCategoryId = categories?.find(c => c.name === TRANSFERS_CATEGORY_NAME)?.id;
            console.log('Transfers category ID:', transfersCategoryId);

            // Start with base query
            let query = supabase
                .from('transaction_categories')
                .select(`
                    amount,
                    transaction:transactions!inner (
                        operation_date
                    )
                `);

            // Apply date range filter
            const fromDate = filters.dateRange.from || DEFAULT_FROM_DATE;
            const toDate = filters.dateRange.to || DEFAULT_TO_DATE;
            query = query
                .gte('transactions.operation_date', fromDate)
                .lte('transactions.operation_date', toDate);

            // Only exclude transfers if we found the transfers category
            if (transfersCategoryId) {
                query = query.neq('category_id', transfersCategoryId);
            }

            // Handle transaction type filter (income/expense)
            if (filters.type.value !== 'all') {
                if (filters.type.value === 'income') {
                    query = query.gte('amount', 0.01);
                } else {
                    query = query.lt('amount', 0);
                }
            }

            // Handle category filters
            if (filters.categories.selected.length > 0) {
                const categoryIds = filters.categories.selected
                    .map(Number)
                    .filter(id => !isNaN(id)); // Filter out invalid IDs
                
                if (categoryIds.length > 0) {
                    if (filters.categories.isNegative) {
                        query = query.not('category_id', 'in', `(${categoryIds.join(',')})`);
                    } else {
                        query = query.in('category_id', categoryIds);
                    }
                }
            }

            // Handle subcategory filters
            if (filters.subcategories.selected.length > 0) {
                const subcategoryIds = filters.subcategories.selected
                    .map(Number)
                    .filter(id => !isNaN(id)); // Filter out invalid IDs
                
                if (subcategoryIds.length > 0) {
                    query = query.in('subcategory_id', subcategoryIds);
                }
            }

            const { data: transactionData, error } = await query;
            console.log('Query error if any:', error);

            if (error) {
                console.error('Query error:', error);
                return { error: 'Failed to fetch analytics data' };
            }

            // Transform data for the chart
            const chartData = groupTransactionsByPeriod(
                transactionData?.map(t => ({
                    date: t.transaction.operation_date,
                    amount: t.amount
                })) || [],
                filters.period.value || 'month'
            );
            console.log('Transformed chart data:', chartData);

            const response = {
                success: true,
                data: {
                    chartData
                }
            };
            console.log('Sending response:', response);
            return response;
        });
    }
} as Actions; 