import type { PageServerLoad, Actions } from './$types'
import { measureAsync } from '$lib/utils/performance';
import type { AnalyticsFilterState } from '$lib/types/filters';

// Constants
const DEFAULT_FROM_DATE = '2024-01-01';
const DEFAULT_TO_DATE = '2024-12-31';
const EXCLUDED_TRANSFERS_CATEGORY_NAME = 'transfers ♻️';

interface TransactionData {
    date: string;
    amount: number;
    categoryId: string;
    categoryName: string;
    subcategoryId?: string;
    subcategoryName?: string;
}

interface ChartDataPoint {
    period: string;
    income: number;
    expenses: number;
    categories: Array<{
        id: string;
        name: string;
        amount: number;
        type: 'income' | 'expense';
        subcategoryId?: string;
        subcategoryName?: string;
    }>;
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
                expenses: 0,
                categories: []
            });
        }
        
        const group = groups.get(key)!;
        const isIncome = row.amount >= 0;
        
        if (isIncome) {
            group.income += row.amount;
        } else {
            group.expenses += Math.abs(row.amount);
        }

        // Add category information
        group.categories.push({
            id: row.categoryId,
            name: row.categoryName,
            amount: Math.abs(row.amount),
            type: isIncome ? 'income' : 'expense',
            subcategoryId: row.subcategoryId,
            subcategoryName: row.subcategoryName
        });
    });
    
    return Array.from(groups.values())
        .sort((a, b) => a.period.localeCompare(b.period));
}

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
    depends('supabase:analytics')

    return await measureAsync('analytics-page-load', async () => {
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, subcategories(id, name)')
            .order('name');

        const transfersCategoryId = categories?.find(c => c.name === EXCLUDED_TRANSFERS_CATEGORY_NAME)?.id;

        let query = supabase
            .from('transaction_categories')
            .select(`
                amount,
                category:categories!inner(id, name),
                subcategory:subcategories(id, name),
                transaction:transactions!inner(
                    operation_date
                )
            `)
            .gte('transactions.operation_date', DEFAULT_FROM_DATE)
            .lte('transactions.operation_date', DEFAULT_TO_DATE);

        if (transfersCategoryId) {
            query = query.neq('category_id', transfersCategoryId);
        }

        const { data: transactionData } = await query;

        const chartData = groupTransactionsByPeriod(
            transactionData?.map(t => ({
                date: t.transaction.operation_date,
                amount: t.amount,
                categoryId: t.category.id,
                categoryName: t.category.name,
                subcategoryId: t.subcategory?.id,
                subcategoryName: t.subcategory?.name
            })) || [],
            'month'
        );

        return {
            chartData,
            categories: categories?.filter(c => c.id !== transfersCategoryId) || [],
            defaultFromDate: DEFAULT_FROM_DATE,
            defaultToDate: DEFAULT_TO_DATE
        };
    });
}

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        return await measureAsync('analytics-filter-action', async () => {
            const formData = await request.formData();
            const filters: AnalyticsFilterState = JSON.parse(formData.get('filters')?.toString() || '{}');

            const { data: categories } = await supabase
                .from('categories')
                .select('id, name, subcategories(id, name)')
                .order('name');

            const transfersCategoryId = categories?.find(c => c.name === EXCLUDED_TRANSFERS_CATEGORY_NAME)?.id;

            let query = supabase
                .from('transaction_categories')
                .select(`
                    amount,
                    category:categories!inner(id, name),
                    subcategory:subcategories(id, name),
                    transaction:transactions!inner(
                        operation_date
                    )
                `);

            const fromDate = filters.dateRange.from || DEFAULT_FROM_DATE;
            const toDate = filters.dateRange.to || DEFAULT_TO_DATE;
            query = query
                .gte('transactions.operation_date', fromDate)
                .lte('transactions.operation_date', toDate);

            if (transfersCategoryId) {
                query = query.neq('category_id', transfersCategoryId);
            }

            if (filters.type.value !== 'all') {
                if (filters.type.value === 'income') {
                    query = query.gte('amount', 0.01);
                } else {
                    query = query.lt('amount', 0);
                }
            }

            if (filters.categories.selected.length > 0) {
                const categoryIds = filters.categories.selected
                    .map(Number)
                    .filter(id => !isNaN(id));
                
                if (categoryIds.length > 0) {
                    if (filters.categories.isNegative) {
                        query = query.not('category_id', 'in', `(${categoryIds.join(',')})`);
                    } else {
                        query = query.in('category_id', categoryIds);
                    }
                }
            }

            if (filters.subcategories.selected.length > 0) {
                const subcategoryIds = filters.subcategories.selected
                    .map(Number)
                    .filter(id => !isNaN(id));
                
                if (subcategoryIds.length > 0) {
                    query = query.in('subcategory_id', subcategoryIds);
                }
            }

            if (filters.search.value) {
                // Search in transaction description via the transactions table
                const searchTerm = `%${filters.search.value}%`;
                if (filters.search.isNegative) {
                    query = query.not('transactions.description', 'ilike', searchTerm);
                } else {
                    query = query.ilike('transactions.description', searchTerm);
                }
            }

            const { data: transactionData, error } = await query;

            if (error) {
                return { error: 'Failed to fetch analytics data' };
            }

            const chartData = groupTransactionsByPeriod(
                transactionData?.map(t => ({
                    date: t.transaction.operation_date,
                    amount: t.amount,
                    categoryId: t.category.id,
                    categoryName: t.category.name,
                    subcategoryId: t.subcategory?.id,
                    subcategoryName: t.subcategory?.name
                })) || [],
                filters.period.value || 'month'
            );

            return {
                success: true,
                data: {
                    chartData
                }
            };
        });
    }
} as Actions;