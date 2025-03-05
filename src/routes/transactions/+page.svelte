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

    // Format currency
    function formatEuro(value: number): string {
        const roundedValue = Math.round(value);
        const formattedValue = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${formattedValue}€`;
    }

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(data.currentPage);
    let filters = $state<TransactionFilterState>(data.filters || DEFAULT_FILTER_STATE);
    let isLoading = $state(false);
    let isUpdating = $state(false);
    let isInitialLoad = $state(true);
    let totals = $state({
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0
    });
    let lastTransactionId = $state('');
    let isFilterExpanded = $state(false);

    // Get current URL for checking parameters
    const url = $state(browser ? new URL(window.location.href) : null);

    $effect(() => {
        if (!browser) return;
        
        // Update URL state
        url.href = window.location.href;
        
        // Skip filter initialization if already updating or URL has date params
        if (isUpdating || (url.searchParams.has('dateFrom') && url.searchParams.has('dateTo'))) {
            isInitialLoad = false;
            return;
        }
        
        // Initialize default date range if needed
        const defaultDateRange = getDefaultMonthDateRange();
        const defaultFilters = {
            ...filters,
            dateRange: {
                from: filters.dateRange.from || defaultDateRange.from,
                to: filters.dateRange.to || defaultDateRange.to
            }
        };
        
        if (!isEqual(filters, defaultFilters) || isInitialLoad) {
            isUpdating = true;
            filters = defaultFilters;
            isInitialLoad = false;
            submitFilters();
            isUpdating = false;
        }
    });

    const { transactionsList, totalPages } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages
    });

    // Function to fetch totals in the background
    async function fetchTotals() {
        try {
            const searchParams = new URLSearchParams();
            
            if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
            if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
            searchParams.set('type', filters.type.value);
            
            if (filters.categories.selected.length > 0) {
                filters.categories.selected.forEach(categoryId => {
                    searchParams.append('categories[]', categoryId);
                });
                searchParams.set('isNegative', filters.categories.isNegative.toString());
            }

            const response = await fetch(`/api/transactions/totals?${searchParams.toString()}`);
            const result = await response.json();
            
            if (result.success) {
                totals = result.data;
            }
        } catch (error) {
            console.error('Error fetching totals:', error);
        }
    }

    // Effect to fetch totals when data changes
    $effect(() => {
        if (!browser || isInitialLoad || !data.transactions?.length) return;
        fetchTotals();
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

    async function handleTypeChange({ detail }: CustomEvent<{ type: 'all' | 'income' | 'expense' }>) {
        filters.type.value = detail.type;
        submitFilters();
    }

    async function handleCategoryChange({ detail }: CustomEvent<{ selected: string[], isNegative: boolean }>) {
        filters.categories = {
            selected: detail.selected,
            isNegative: detail.isNegative
        };
        currentPage = 1;
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
        isUpdating = true;

        try {
            const searchParams = new URLSearchParams();
            
            // Add all filter parameters
            if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
            if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
            searchParams.set('sort.column', filters.sort.column);
            searchParams.set('sort.direction', filters.sort.direction);
            searchParams.set('type.value', filters.type.value);
            searchParams.set('page', currentPage.toString());
            
            // Add category filters
            if (filters.categories.selected.length > 0) {
                filters.categories.selected.forEach(categoryId => {
                    searchParams.append('categories.selected[]', categoryId);
                });
                searchParams.set('categories.isNegative', filters.categories.isNegative.toString());
            }

            await goto(`${window.location.pathname}?${searchParams.toString()}`, { keepFocus: true });
        } catch (error) {
            console.error('Error updating filters:', error);
        } finally {
            isLoading = false;
            isUpdating = false;
        }
    }

    // Data synchronization effect
    $effect(() => {
        if (!data.transactions || isUpdating) return;
        
        const newFilters = data.filters || DEFAULT_FILTER_STATE;
        if (data.currentPage !== currentPage) {
            currentPage = data.currentPage;
        }
        if (!isEqual(filters, newFilters)) {
            filters = newFilters;
        }
    });

    // Helper function to get active filters summary
    function getActiveFiltersSummary(): string {
        const typeValue = filters.type.value;
        const categoryCount = filters.categories.selected.length;
        let totalFilters = categoryCount;
        
        // Add type filter to count if it's not 'all'
        if (typeValue !== 'all') {
            totalFilters += 1;
        }
        
        // If we have any filters, show the count
        if (totalFilters > 0) {
            return `${totalFilters} filter${totalFilters > 1 ? 's' : ''}`;
        }
        
        // Default case when no filters are active
        return 'All';
    }
</script>

<div class="transactions-container">
    <div class="transactions mobile-layout">
        <!-- Fixed Top Section -->
        <div class="fixed-top">
            <!-- Date Range Filter -->
            <div class="mb-2 md:mb-6">
                <DateRangeFilter 
                    dateRange={filters.dateRange}
                    on:change={handleDateRangeChange}
                />
            </div>

            <!-- Summary Stats and Sort Button -->
            <div class="summary-stats mb-2 md:mb-6">
                <div class="grid grid-cols-3 gap-2">
                    <!-- Income Card -->
                    <div class="stat-card text-center">
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Income</span>
                        <div class="flex items-center justify-center gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span class="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                {formatEuro(totals.totalIncome)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Expenses Card -->
                    <div class="stat-card text-center">
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Expenses</span>
                        <div class="flex items-center justify-center gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <span class="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                {formatEuro(totals.totalExpenses)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Sort/Filter Button -->
                    <button 
                        class="stat-card cursor-pointer transition-all duration-200" 
                        class:active={isFilterExpanded}
                        onclick={() => isFilterExpanded = !isFilterExpanded}
                        aria-expanded={isFilterExpanded}
                        aria-controls="filter-section"
                    >
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Sort & Filter</span>
                        <div class="flex items-center justify-between">
                            <div class="flex-1"></div>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center flex-1">
                                {getActiveFiltersSummary()}
                            </span>
                            <div class="flex-1 flex justify-end">
                                <svg 
                                    class="w-5 h-5 transform transition-transform duration-200 flex-shrink-0" 
                                    class:rotate-180={isFilterExpanded}
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    stroke-width="2" 
                                    stroke-linecap="round" 
                                    stroke-linejoin="round"
                                >
                                    <path d="m6 9 6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <!-- Expandable Sort/Filter Section -->
            <div 
                id="filter-section"
                class="overflow-hidden transition-all duration-200 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                class:h-0={!isFilterExpanded}
                class:h-auto={isFilterExpanded}
                class:mb-4={isFilterExpanded}
            >
                <div class="p-4">
                    <!-- Sort Controls Component -->
                    <TransactionSortControls 
                        filters={filters}
                        categories={data.categories}
                        on:sortChange={handleSortChange}
                        on:typeChange={handleTypeChange}
                        on:categoryChange={handleCategoryChange}
                    />
                </div>
            </div>
        </div>

        <!-- Scrollable Middle Section -->
        <div class="scrollable-content">
            {#if transactionsList?.length}
                <!-- Card-based transaction list -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
                            <div class="p-4">
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
                <div class="mt-4 mb-4">
                    <TransactionPagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        on:pageChange={handlePageChange}
                    />
                </div>
            {:else}
                <div class="flex flex-col items-center justify-center p-8 text-center">
                    <svg class="size-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">🙃 No transactions found 🙃</h3>
                    <p class="text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Mobile Layout Styles */
    @media (max-width: 768px) {
        .mobile-layout {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 4rem);
            overflow: hidden;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 4rem;
        }

        .fixed-top {
            background-color: rgb(255, 255, 255);
            padding: 1rem 1rem 0.5rem 1rem;
            z-index: 10;
        }

        .scrollable-content {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem 1rem;
            -webkit-overflow-scrolling: touch;
        }

        /* Adjust stat cards for mobile */
        .summary-stats .stat-card {
            padding: 0.5rem;
        }

        .summary-stats .stat-card span {
            font-size: 0.75rem;
        }

        .summary-stats .stat-card .text-base {
            font-size: 0.875rem;
        }

        /* Dark mode support */
        :global(.dark) .fixed-top {
            background-color: rgb(15, 23, 42);
        }
    }

    /* Existing styles */
    .stat-card {
        background-color: rgb(255, 255, 255);
        border-radius: 0.75rem;
        padding: 0.75rem;
        border: 1px solid rgb(229, 231, 235);
        transition: all 0.2s ease-in-out;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }
    
    .stat-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .stat-card.active {
        background-color: rgb(243, 244, 246);
    }
    
    /* Dark mode support */
    :global(.dark) .stat-card {
        background-color: rgb(15, 23, 42);
        border-color: rgb(51, 65, 85);
    }

    :global(.dark) .stat-card.active {
        background-color: rgb(31, 41, 55);
    }
</style> 