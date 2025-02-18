import type { PageServerLoad, Actions } from './$types'
import type { Transaction } from '$lib/types'
import { measureAsync } from '$lib/utils/performance';

// Centralize the query fields for reuse and maintainability
const TRANSACTION_SELECT = `
    id,
    uuid,
    operation_date,
    value_date,
    description,
    user_description,
    account:accounts!inner (
        id,
        bank_id,
        account_type,
        account_number,
        bank:banks!inner (
            id,
            name
        )
    ),
    categories:transaction_categories!inner (
        id,
        transaction_id,
        category_id,
        subcategory_id,
        amount,
        category:categories!inner (
            id,
            name
        ),
        subcategory:subcategories (
            id,
            category_id,
            name
        )
    )
`;

const PAGE_SIZE = 20;
const DEFAULT_FROM_DATE = '2024-12-01';

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
    depends('supabase:transactions')

    return await measureAsync('transactions-page-load', async () => {
        const [{ data: categories }, { data: transactions, count }] = await Promise.all([
            supabase
                .from('categories')
                .select('id, name, subcategories (id, category_id, name)')
                .order('name'),
            supabase
                .from('transactions')
                .select(TRANSACTION_SELECT, { count: 'exact' })
                .gte('operation_date', DEFAULT_FROM_DATE)
                .order('operation_date', { ascending: false })
                .range(0, PAGE_SIZE - 1)
        ]);

        return {
            transactions: transactions as Transaction[] ?? [],
            totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
            currentPage: 1,
            categories: categories ?? [],
            defaultFromDate: DEFAULT_FROM_DATE
        };
    });
}

interface FilterOptions {
    type: { value: 'all' | 'income' | 'expense' };
    categories: { selected: string[]; isNegative: boolean };
    subcategories: { selected: string[] };
    dateRange: { from?: string; to?: string };
    search: { value: string; isNegative: boolean };
}

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        return await measureAsync('transactions-filter-action', async () => {
            const formData = await request.formData();
            const filters: FilterOptions = JSON.parse(formData.get('filters')?.toString() || '{}');
            const page = Math.max(1, parseInt(formData.get('page')?.toString() || '1'));
            const offset = (page - 1) * PAGE_SIZE;

            // Start with base query
            let query = supabase
                .from('transactions')
                .select(TRANSACTION_SELECT, { count: 'exact' });

            // Apply date range filter first (most restrictive)
            const fromDate = filters.dateRange.from || DEFAULT_FROM_DATE;
            query = query.gte('operation_date', fromDate);
            if (filters.dateRange.to) {
                query = query.lte('operation_date', filters.dateRange.to);
            }

            // Handle transaction type filter (income/expense)
            if (filters.type.value !== 'all') {
                if (filters.type.value === 'income') {
                    query = query.gte('categories.amount', 0.01);
                } else {
                    query = query.lt('categories.amount', 0);
                }
            }

            // Handle category filters
            if (filters.categories.selected.length > 0) {
                const categoryIds = filters.categories.selected.map(Number);
                if (filters.categories.isNegative) {
                    query = query.not('categories.category_id', 'in', `(${categoryIds.join(',')})`);
                } else {
                    query = query.in('categories.category_id', categoryIds);
                }
            }

            // Handle subcategory filters
            if (filters.subcategories.selected.length > 0) {
                const subcategoryIds = filters.subcategories.selected.map(Number);
                query = query.in('categories.subcategory_id', subcategoryIds);
            }

            // Handle description search
            if (filters.search.value) {
                const searchValue = `%${filters.search.value.replace(/[%_]/g, '')}%`;
                if (filters.search.isNegative) {
                    query = query.or(
                        `description.not.ilike.${searchValue}`
                    ).or(
                        `user_description.is.null, user_description.not.ilike.${searchValue}`
                    );                    
                } else {
                    query = query.or(`description.ilike.${searchValue},user_description.ilike.${searchValue}`);
                }
            }

            // Apply final ordering and pagination
            const { data: transactions, error, count } = await query
                .order('operation_date', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) {
                console.error('Query error:', error);
                return { error: 'Failed to fetch transactions' };
            }

            return {
                transactions,
                totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
                currentPage: page
            };
        });
    }
} as Actions; 