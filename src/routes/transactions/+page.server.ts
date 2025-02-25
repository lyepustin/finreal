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

interface FilterOptions {
    type: { value: 'all' | 'income' | 'expense' };
    categories: { selected: string[]; isNegative: boolean };
    subcategories: { selected: string[] };
    dateRange: { from?: string; to?: string };
    search: { value: string; isNegative: boolean };
    sort: {
        column: 'date' | 'amount' | 'description' | null;
        direction: 'asc' | 'desc';
    };
}

function parseFilters(searchParams: URLSearchParams): FilterOptions {
    const filters: FilterOptions = {
        type: { value: searchParams.get('type.value') as FilterOptions['type']['value'] || 'all' },
        dateRange: {
            from: searchParams.get('dateRange.from') || DEFAULT_FROM_DATE,
            to: searchParams.get('dateRange.to') || ''
        },
        categories: {
            selected: searchParams.getAll('categories.selected[]') || [],
            isNegative: searchParams.get('categories.isNegative') === 'true'
        },
        subcategories: {
            selected: searchParams.getAll('subcategories.selected[]') || []
        },
        search: {
            value: searchParams.get('search.value') || '',
            isNegative: searchParams.get('search.isNegative') === 'true'
        },
        sort: {
            column: (searchParams.get('sort.column') || 'date') as FilterOptions['sort']['column'],
            direction: (searchParams.get('sort.direction') || 'desc') as 'asc' | 'desc'
        }
    };
    return filters;
}

export const load: PageServerLoad = async ({ depends, locals: { supabase }, url }) => {
    depends('supabase:transactions')

    return await measureAsync('transactions-page-load', async () => {
        const filters = parseFilters(url.searchParams);

        // Start with base query for count
        let query = supabase
            .from('transactions')
            .select(TRANSACTION_SELECT, { count: 'exact' });

        // Apply filters
        const fromDate = filters.dateRange.from || DEFAULT_FROM_DATE;
        query = query.gte('operation_date', fromDate);
        if (filters.dateRange.to) {
            query = query.lte('operation_date', filters.dateRange.to);
        }

        if (filters.type.value !== 'all') {
            if (filters.type.value === 'income') {
                query = query.gte('categories.amount', 0.01);
            } else {
                query = query.lt('categories.amount', 0);
            }
        }

        if (filters.categories.selected.length > 0) {
            const categoryIds = filters.categories.selected.map(Number);
            if (filters.categories.isNegative) {
                query = query.not('categories.category_id', 'in', `(${categoryIds.join(',')})`);
            } else {
                query = query.in('categories.category_id', categoryIds);
            }
        }

        if (filters.subcategories.selected.length > 0) {
            const subcategoryIds = filters.subcategories.selected.map(Number);
            query = query.in('categories.subcategory_id', subcategoryIds);
        }

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

        // First get the total count with the current filters
        const { count } = await query;
        const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

        // Validate and adjust page number if necessary
        let page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        if (page > totalPages) {
            page = 1;
        }

        const offset = (page - 1) * PAGE_SIZE;

        // Apply sorting
        if (filters.sort?.column === 'amount') {
            query = query.order('operation_date', { ascending: false });
        } else {
            const ascending = filters.sort?.direction === 'asc';
            switch (filters.sort?.column) {
                case 'date':
                    query = query.order('operation_date', { ascending });
                    break;
                case 'description':
                    query = query.order('user_description', { ascending, nullsLast: true })
                            .order('description', { ascending });
                    break;
                default:
                    query = query.order('operation_date', { ascending: false });
            }
        }

        // Fetch data with pagination
        const [{ data: categories }, { data: transactions, error }] = await Promise.all([
            supabase
                .from('categories')
                .select('id, name, subcategories (id, category_id, name)')
                .order('name'),
            query.range(offset, offset + PAGE_SIZE - 1)
        ]);

        if (error) {
            console.error('Query error:', error);
            return {
                error: 'Failed to fetch transactions',
                transactions: [],
                totalPages: 0,
                currentPage: 1,
                categories: categories ?? [],
                defaultFromDate: DEFAULT_FROM_DATE,
                filters,
                shouldRedirectToPage1: page > 1
            };
        }

        // Handle amount sorting separately
        let finalTransactions = transactions;
        if (filters.sort?.column === 'amount' && finalTransactions) {
            const sortedTransactions = finalTransactions.map(transaction => ({
                ...transaction,
                totalAmount: transaction.categories.reduce((sum, tc) => sum + tc.amount, 0)
            })).sort((a, b) => {
                return filters.sort.direction === 'asc'
                    ? a.totalAmount - b.totalAmount
                    : b.totalAmount - a.totalAmount;
            });
            finalTransactions = sortedTransactions;
        }

        return {
            transactions: finalTransactions as Transaction[] ?? [],
            totalPages,
            currentPage: page,
            categories: categories ?? [],
            defaultFromDate: DEFAULT_FROM_DATE,
            filters,
            shouldRedirectToPage1: page > totalPages
        };
    });
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

            // Apply sorting and pagination based on sort type
            let transactions: any[] | null = null;
            let error = null;
            let count = 0;

            if (filters.sort?.column === 'amount') {
                // For amount sorting, fetch all filtered results without pagination
                const result = await query.order('operation_date', { ascending: false });
                error = result.error;
                count = result.count ?? 0;

                if (!error && result.data) {
                    // Calculate total amount for each transaction and sort
                    const allTransactions = result.data.map(transaction => ({
                        ...transaction,
                        totalAmount: transaction.categories.reduce((sum, tc) => sum + tc.amount, 0)
                    }));

                    // Sort by total amount
                    allTransactions.sort((a, b) => {
                        return filters.sort.direction === 'asc' 
                            ? a.totalAmount - b.totalAmount 
                            : b.totalAmount - a.totalAmount;
                    });

                    // Apply pagination after sorting
                    transactions = allTransactions.slice(offset, offset + PAGE_SIZE);
                }
            } else {
                // For other sorts, apply sorting and pagination in the database
                const ascending = filters.sort?.direction === 'asc';
                switch (filters.sort?.column) {
                    case 'date':
                        query = query.order('operation_date', { ascending });
                        break;
                    case 'description':
                        query = query.order('user_description', { ascending, nullsLast: true })
                                   .order('description', { ascending });
                        break;
                    default:
                        query = query.order('operation_date', { ascending: false });
                }

                const result = await query.range(offset, offset + PAGE_SIZE - 1);
                transactions = result.data;
                error = result.error;
                count = result.count ?? 0;
            }

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