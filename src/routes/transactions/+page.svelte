<script lang="ts">
    import type { PageData } from './$types'
    import type { Transaction } from '$lib/types'
    import type { TransactionFilterState } from '$lib/types/filters'
    import { goto, invalidate } from '$app/navigation'
    import { browser } from '$app/environment'
    import TransactionSortControls from '$lib/components/TransactionSortControls.svelte'
    import TransactionPagination from '$lib/components/TransactionPagination.svelte'
    import DateRangeFilter from '$lib/components/DateRangeFilter.svelte'
    import { DEFAULT_FILTER_STATE } from '$lib/types/filters'
    import { isEqual } from 'lodash'
    import { getDefaultMonthDateRange } from '$lib/utils/dates'

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(data.currentPage);
    let filters = $state<TransactionFilterState>(data.filters || DEFAULT_FILTER_STATE);
    let isLoading = $state(false);
    let isUpdating = $state(false);
    let isInitialLoad = $state(true);

    // Get current URL for checking parameters
    const url = $state(browser ? new URL(window.location.href) : null);

    $effect(() => {
        if (browser) {
            url.href = window.location.href;
        }
    });

    // Initialize default dates if not provided and update URL on initial load
    $effect(() => {
        if (!browser || isUpdating) return;
        
        // If URL already has date parameters, don't modify filters
        if (url.searchParams.has('dateFrom') && url.searchParams.has('dateTo')) {
            isInitialLoad = false;
            return;
        }
        
        // Get default date range
        const defaultDateRange = getDefaultMonthDateRange();
        
        const defaultFilters = {
            ...filters,
            dateRange: {
                from: filters.dateRange.from || defaultDateRange.from,
                to: filters.dateRange.to || defaultDateRange.to
            }
        };
        
        if (!isEqual(filters, defaultFilters)) {
            isUpdating = true;
            filters = defaultFilters;
            submitFilters();
            isUpdating = false;
        } else if (isInitialLoad) {
            // If it's the initial load, update URL
            isInitialLoad = false;
            submitFilters();
        }
    });

    const { transactionsList, totalPages } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages
    });

    function handleSortChange({ detail }: CustomEvent<{ column: TransactionFilterState['sort']['column'] }>) {
        filters.sort = {
            column: detail.column,
            direction: filters.sort.column === detail.column
                ? filters.sort.direction === 'asc' ? 'desc' : 'asc'
                : 'desc'
        };
        submitFilters();
    }

    function handleTypeChange({ detail }: CustomEvent<{ type: 'all' | 'income' | 'expense' }>) {
        filters.type.value = detail.type;
        submitFilters();
    }

    function handlePageChange({ detail }: CustomEvent<{ page: number }>) {
        if (detail.page < 1 || detail.page > totalPages) return;
        currentPage = detail.page;
        submitFilters();
    }

    function handleDateRangeChange({ detail: dateRange }) {
        filters = {
            ...filters,
            dateRange
        };
        currentPage = 1;
        submitFilters();
    }

    function handleTransactionClick(transaction: Transaction) {
        const currentUrl = window.location.pathname + window.location.search;
        goto(`/transactions/${transaction.id}?returnUrl=${encodeURIComponent(currentUrl)}`);
    }

    async function submitFilters() {
        if (!browser || isUpdating) return;
        isLoading = true;

        try {
            const searchParams = new URLSearchParams();
            
            // Add all filter parameters
            if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
            if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
            searchParams.set('sort.column', filters.sort.column);
            searchParams.set('sort.direction', filters.sort.direction);
            searchParams.set('type.value', filters.type.value);
            searchParams.set('page', currentPage.toString());

            await goto(`${window.location.pathname}?${searchParams.toString()}`, { keepFocus: true });
        } catch (error) {
            console.error('Error updating filters:', error);
        } finally {
            isLoading = false;
        }
    }

    // Update data effect
    $effect(() => {
        if (data.transactions) {
            currentPage = data.currentPage;
            if (!isUpdating) {
                filters = data.filters || DEFAULT_FILTER_STATE;
            }
        }
    });
</script>

<div class="transactions-container">
    <div class="transactions">
        <!-- Date Range Filter -->
        <div class="mb-4">
            <DateRangeFilter 
                dateRange={filters.dateRange}
                on:change={handleDateRangeChange}
            />
        </div>

        <!-- Sort Controls Component -->
        <div class="mb-4">
            <TransactionSortControls 
                filters={filters}
                on:sortChange={handleSortChange}
                on:typeChange={handleTypeChange}
            />
        </div>

        <!-- Transaction List Section -->
        {#if transactionsList?.length}
            <!-- Card-based transaction list -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each transactionsList as transaction}
                    <!-- Transaction Card -->
                    <div 
                        class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md transition dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]"
                        onclick={() => handleTransactionClick(transaction)}
                        onkeydown={(e) => e.key === 'Enter' && handleTransactionClick(transaction)}
                        tabindex="0"
                        role="button"
                        aria-label="View transaction details"
                    >
                        <div class="p-4 md:p-5">
                            <!-- Date and Amount -->
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {new Date(transaction.operation_date).toLocaleDateString()}
                                </span>
                                {#if transaction.categories.reduce((sum, tc) => sum + tc.amount, 0) < 0}
                                    <span class="text-base font-semibold text-red-600 dark:text-red-400">
                                        {transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}
                                    </span>
                                {:else}
                                    <span class="text-base font-semibold text-green-600 dark:text-green-400">
                                        {transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}
                                    </span>
                                {/if}
                            </div>
                            
                            <!-- Description -->
                            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300 line-clamp-2 mb-2">
                                {transaction.user_description || transaction.description}
                            </h3>
                            
                            <!-- Categories -->
                            <div class="mt-auto">
                                <div class="flex flex-wrap gap-1 mt-2">
                                    {#each transaction.categories as tc}
                                        <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {tc.category.name}
                                            {#if tc.subcategory}
                                                - {tc.subcategory.name}
                                            {/if}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Pagination Component -->
            <TransactionPagination 
                currentPage={currentPage}
                totalPages={totalPages}
                on:pageChange={handlePageChange}
            />
        {:else}
            <div class="flex flex-col items-center justify-center p-8 text-center">
                <svg class="size-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">🙃 No transactions found 🙃</h3>
                <p class="text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Tailwind classes handle all styling */
</style> 