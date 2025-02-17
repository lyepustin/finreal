import type { PageServerLoad, Actions } from './$types'
import type { Transaction } from '$lib/types'
import { measureAsync } from '$lib/utils/performance';

const TRANSACTIONS_QUERY = `
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

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
    depends('supabase:transactions')

    return await measureAsync('transactions-page-load', async () => {
        // Fetch all categories first
        const { data: allCategories } = await measureAsync('fetch-categories', () => 
            supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        category_id,
                        name
                    )
                `)
                .order('name')
        );

        // Default values if no filters are provided
        const page = 1;
        const pageSize = 20;
        const offset = (page - 1) * pageSize;

        // Get initial data without filters
        const query = supabase.from('transactions').select(TRANSACTIONS_QUERY);
        const countQuery = supabase.from('transactions').select('*', { count: 'exact', head: true });

        const [{ data: transactions, error }, { count, error: countError }] = await measureAsync(
            'fetch-transactions-and-count',
            () => Promise.all([
                query.order('operation_date', { ascending: false }).range(offset, offset + pageSize - 1),
                countQuery
            ])
        );

        if (error || countError) {
            console.error('Error fetching transactions:', error || countError)
            return { transactions: [], totalPages: 0, currentPage: 1, categories: [] }
        }

        const totalPages = count ? Math.ceil(count / pageSize) : 0;

        return { 
            transactions: transactions as Transaction[] ?? [], 
            totalPages,
            currentPage: page,
            categories: allCategories ?? []
        }
    });
}

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        return await measureAsync('transactions-filter-action', async () => {
            const formData = await request.formData();
            const filtersJson = formData.get('filters')?.toString() || '{}';
            const page = parseInt(formData.get('page')?.toString() || '1');
            const filters = JSON.parse(filtersJson);
            const pageSize = 20;
            const offset = (page - 1) * pageSize;

            // Build the transaction categories query to filter by amount
            const { data: allTransactions, error: tcError } = await measureAsync(
                'fetch-filtered-transactions',
                async () => {
                    let transactionQuery = supabase
                        .from('transactions')
                        .select(`
                            id,
                            operation_date,
                            transaction_categories!inner (
                                transaction_id,
                                category_id,
                                subcategory_id,
                                amount
                            )
                        `)
                        .order('operation_date', { ascending: false });

                    // Apply type filter
                    if (filters.type.value !== 'all') {
                        if (filters.type.value === 'income') {
                            transactionQuery = filters.type.isNegative ?
                                transactionQuery.lt('transaction_categories.amount', 0) :
                                transactionQuery.gte('transaction_categories.amount', 0);
                        } else {
                            transactionQuery = filters.type.isNegative ?
                                transactionQuery.gte('transaction_categories.amount', 0) :
                                transactionQuery.lt('transaction_categories.amount', 0);
                        }
                    }

                    return await transactionQuery;
                }
            );
            
            let matchingIds: number[] = [];

            if (allTransactions?.length) {
                // Create a map of transaction IDs to their categories, preserving order
                const transactionCategoriesMap = new Map<number, Set<number>>();
                const transactionSubcategoriesMap = new Map<number, Set<number>>();
                const seenTransactions = new Set<number>();
                
                // Process transactions in order, keeping only the first occurrence
                allTransactions.forEach(t => {
                    const transactionId = t.id;
                    
                    // Skip if we've already processed this transaction
                    if (seenTransactions.has(transactionId)) return;
                    seenTransactions.add(transactionId);
                    
                    // Process all categories for this transaction
                    t.transaction_categories.forEach(tc => {
                        // Handle categories
                        if (!transactionCategoriesMap.has(transactionId)) {
                            transactionCategoriesMap.set(transactionId, new Set());
                        }
                        if (tc.category_id) {
                            transactionCategoriesMap.get(transactionId)?.add(tc.category_id);
                        }

                        // Handle subcategories
                        if (!transactionSubcategoriesMap.has(transactionId)) {
                            transactionSubcategoriesMap.set(transactionId, new Set());
                        }
                        if (tc.subcategory_id) {
                            transactionSubcategoriesMap.get(transactionId)?.add(tc.subcategory_id);
                        }
                    });
                });

                // Initialize matchingIds with all transactions
                matchingIds = Array.from(seenTransactions);

                // Filter by categories if selected
                if (filters.categories.selected.length > 0) {
                    const selectedCategories = new Set(filters.categories.selected.map(Number));

                    if (filters.categories.isNegative) {
                        // For negative filter, we want transactions that DON'T have ANY of the selected categories
                        matchingIds = matchingIds.filter(transactionId => {
                            const categories = transactionCategoriesMap.get(transactionId) || new Set();
                            // Check if none of the transaction's categories are in the selected categories
                            return !Array.from(categories).some(cat => selectedCategories.has(cat));
                        });
                    } else {
                        // For positive filter, we want transactions that have ANY of the selected categories
                        matchingIds = matchingIds.filter(transactionId => {
                            const categories = transactionCategoriesMap.get(transactionId) || new Set();
                            return Array.from(categories).some(cat => selectedCategories.has(cat));
                        });
                    }
                }

                // Filter by subcategories if selected
                if (filters.subcategories.selected.length > 0) {
                    const selectedSubcategories = new Set(filters.subcategories.selected.map(Number));

                    if (filters.subcategories.isNegative) {
                        // For negative filter, we want transactions that DON'T have ANY of the selected subcategories
                        matchingIds = matchingIds.filter(transactionId => {
                            const subcategories = transactionSubcategoriesMap.get(transactionId) || new Set();
                            return !Array.from(subcategories).some(sub => selectedSubcategories.has(sub));
                        });
                    } else {
                        // For positive filter, we want transactions that have ANY of the selected subcategories
                        matchingIds = matchingIds.filter(transactionId => {
                            const subcategories = transactionSubcategoriesMap.get(transactionId) || new Set();
                            return Array.from(subcategories).some(sub => selectedSubcategories.has(sub));
                        });
                    }
                }
            }

            // Start building the main query
            let baseQuery = supabase.from('transactions').select(TRANSACTIONS_QUERY);
            let countQuery = supabase.from('transactions').select('*', { count: 'exact', head: true });

            // Apply transaction IDs filter only if we have specific filters active
            if (filters.type.value !== 'all' || 
                filters.categories.selected.length > 0 || 
                filters.subcategories.selected.length > 0) {
                if (matchingIds.length > 0) {
                    baseQuery = baseQuery.in('id', matchingIds);
                    countQuery = countQuery.in('id', matchingIds);
                } else {
                    return {
                        transactions: [],
                        totalPages: 0,
                        currentPage: page
                    };
                }
            }

            // Apply date filter
            if (filters.dateRange.from || filters.dateRange.to) {
                if (filters.dateRange.from) {
                    const op = filters.dateRange.isNegative ? 'lt' : 'gte';
                    baseQuery = baseQuery[op]('operation_date', filters.dateRange.from);
                    countQuery = countQuery[op]('operation_date', filters.dateRange.from);
                }
                if (filters.dateRange.to) {
                    const op = filters.dateRange.isNegative ? 'gt' : 'lte';
                    baseQuery = baseQuery[op]('operation_date', filters.dateRange.to);
                    countQuery = countQuery[op]('operation_date', filters.dateRange.to);
                }
            }

            // Apply search filter
            if (filters.search.value) {
                const searchValue = `%${filters.search.value}%`;
                if (filters.search.isNegative) {
                    baseQuery = baseQuery.not('description', 'ilike', searchValue).not('user_description', 'ilike', searchValue);
                    countQuery = countQuery.not('description', 'ilike', searchValue).not('user_description', 'ilike', searchValue);
                } else {
                    baseQuery = baseQuery.or('description.ilike.' + searchValue + ',user_description.ilike.' + searchValue);
                    countQuery = countQuery.or('description.ilike.' + searchValue + ',user_description.ilike.' + searchValue);
                }
            }

            // Execute final queries with timing
            const [{ data: transactions, error }, { count, error: countError }] = await measureAsync(
                'fetch-final-filtered-results',
                () => Promise.all([
                    baseQuery.order('operation_date', { ascending: false }).range(offset, offset + pageSize - 1),
                    countQuery
                ])
            );

            if (error || countError) {
                return {
                    error: 'Failed to fetch transactions'
                };
            }

            const totalPages = count ? Math.ceil(count / pageSize) : 0;

            return {
                transactions,
                totalPages,
                currentPage: page
            };
        });
    }
} as Actions; 