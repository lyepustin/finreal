<script lang="ts">
    import type { PageData } from './$types'
    import type { Category, SubCategory, Transaction } from '$lib/types'
    import type { TransactionFilterState } from '$lib/types/filters'
    import { transactions } from '$lib/stores/transactions'
    import { enhance } from '$app/forms'
    import { goto, invalidate } from '$app/navigation'
    import { browser } from '$app/environment'
    import TransactionFilters from '$lib/components/TransactionFilters.svelte'
    import TransactionSortControls from '$lib/components/TransactionSortControls.svelte'
    import TransactionPagination from '$lib/components/TransactionPagination.svelte'
    import { DEFAULT_FILTER_STATE } from '$lib/types/filters'

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(data.currentPage);
    
    const { transactionsList, totalPages, categories: allCategories, defaultFromDate } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages,
        categories: data.categories,
        defaultFromDate: data.defaultFromDate
    });

    $inspect(transactionsList)
    let editingTransaction = $state<number | null>(null);
    let editDescription = $state('');
    let isFiltersVisible = $state(false);

    // Filter state
    let filters = $state<TransactionFilterState>(DEFAULT_FILTER_STATE);
    
    // Count active filters
    let activeFiltersCount = $state(0);
    
    $effect(() => {
        let count = 0;
        if (filters.type.value !== 'all') count++;
        if (filters.dateRange.from && filters.dateRange.from !== defaultFromDate) count++;
        if (filters.dateRange.to) count++;
        if (filters.categories.selected.length > 0) count++;
        if (filters.subcategories.selected.length > 0) count++;
        if (filters.search.value) count++;
        activeFiltersCount = count;
    });

    // Effects
    $effect(() => {
        // Update the from date when defaultFromDate changes
        if (!filters.dateRange.from) {
            filters.dateRange.from = defaultFromDate || '';
        }
    });

    // Sync filters with URL parameters and handle redirections
    $effect(() => {
        if (browser) {
            // Update filters from URL params
            filters = data.filters;

            // Handle redirection to page 1 if needed
            if (data.shouldRedirectToPage1) {
                const params = new URLSearchParams(window.location.search);
                params.set('page', '1');
                goto(`${window.location.pathname}?${params.toString()}`, { replaceState: true });
            }
        }
    });

    // Update URL when filters change
    function updateURL() {
        if (!browser) return;
        
        const params = new URLSearchParams();
        
        // Only add parameters that are not default values
        if (filters.type.value !== 'all') {
            params.set('type', filters.type.value);
        }
        
        if (filters.dateRange.from && filters.dateRange.from !== defaultFromDate) {
            params.set('dateFrom', filters.dateRange.from);
        }
        
        if (filters.dateRange.to) {
            params.set('dateTo', filters.dateRange.to);
        }
        
        if (filters.categories.selected.length > 0) {
            params.set('categories', filters.categories.selected.join(','));
        }
        
        if (filters.categories.isNegative) {
            params.set('excludeCategories', 'true');
        }
        
        if (filters.subcategories.selected.length > 0) {
            params.set('subcategories', filters.subcategories.selected.join(','));
        }
        
        if (filters.search.value) {
            params.set('search', filters.search.value);
        }
        
        if (filters.search.isNegative) {
            params.set('excludeSearch', 'true');
        }
        
        if (filters.sort.column !== 'date' || filters.sort.direction !== 'desc') {
            params.set('sortColumn', filters.sort.column || 'date');
            params.set('sortDirection', filters.sort.direction);
        }

        if (currentPage > 1) {
            params.set('page', currentPage.toString());
        }

        // Update URL without reloading the page
        const newURL = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newURL);
    }

    let isLoading = $state(false);
    let abortController: AbortController | null = $state(null);
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Transaction editing functions
    function startEditing(transaction: Transaction) {
        editingTransaction = transaction.id;
        editDescription = transaction.user_description || transaction.description;
    }

    async function saveDescription(transaction: Transaction) {
        await transactions.updateTransactionDescription(transaction.id, editDescription);
        editingTransaction = null;
        
        // Properly invalidate the data to refresh from server
        await invalidate('supabase:transactions');
    }

    function focusOnElement(node: HTMLElement) {
        node.focus();
        return {};
    }

    function handleFilterChange({ detail }: CustomEvent<{ filters: TransactionFilterState, currentPage: number }>) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Update local filters state with the received filters
            filters = detail.filters;
            
            // Reset to page 1 when filters change
            currentPage = 1;
            const filterForm = document.getElementById('filter-form') as HTMLFormElement;
            if (filterForm) {
                const pageInput = filterForm.querySelector('input[name="page"]') as HTMLInputElement;
                if (pageInput) {
                    pageInput.value = '1';
                }
                filterForm.requestSubmit();
            }
        }, 300);
    }

    function handleClearFilters() {
        // Reset filters to default state
        filters = DEFAULT_FILTER_STATE;
        
        // Set the from date to the default
        if (defaultFromDate) {
            filters.dateRange.from = defaultFromDate;
        }
        
        currentPage = 1;
        const filterForm = document.getElementById('filter-form') as HTMLFormElement;
        if (filterForm) {
            filterForm.requestSubmit();
        }
    }

    function handleSortChange({ detail }: CustomEvent<{ column: TransactionFilterState['sort']['column'] }>) {
        if (filters.sort.column === detail.column) {
            // Toggle direction if same column
            filters.sort.direction = filters.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Set new column with default desc direction
            filters.sort.column = detail.column;
            filters.sort.direction = 'desc';
        }
        handleFilterChange({ detail: { filters, currentPage: 1 } } as CustomEvent<{ filters: TransactionFilterState, currentPage: number }>);
    }

    function handlePageChange({ detail }: CustomEvent<{ page: number }>) {
        // Validate page number
        if (detail.page < 1 || detail.page > totalPages) {
            return;
        }
        
        currentPage = detail.page;
        const filterForm = document.getElementById('filter-form') as HTMLFormElement;
        if (filterForm) {
            const pageInput = filterForm.querySelector('input[name="page"]') as HTMLInputElement;
            if (pageInput) {
                pageInput.value = detail.page.toString();
            }
            filterForm.requestSubmit();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') editingTransaction = null;
    }

    function handleTransactionClick(transaction: Transaction) {
        // Preserve current URL parameters for the return URL
        const currentUrl = window.location.pathname + window.location.search;
        goto(`/transactions/${transaction.id}?returnUrl=${encodeURIComponent(currentUrl)}`);
    }

    // Update data effect
    $effect(() => {
        if (data.transactions) {
            currentPage = data.currentPage;
        }
    });

    // Custom form enhancement for GET requests
    function enhanceGetForm(node: HTMLFormElement) {
        async function handleSubmit(event: Event) {
            event.preventDefault();
            isLoading = true;

            try {
                // Get the form data
                const formData = new FormData(node);
                const searchParams = new URLSearchParams();
                
                // Convert FormData to URLSearchParams
                for (const [key, value] of formData) {
                    if (value) {
                        searchParams.append(key, value.toString());
                    }
                }

                // Validate page number against total pages
                const pageNum = parseInt(searchParams.get('page') || '1');
                if (pageNum > totalPages) {
                    searchParams.set('page', '1');
                    currentPage = 1;
                }

                // Update the URL
                const newURL = `${window.location.pathname}?${searchParams.toString()}`;
                await goto(newURL, { keepFocus: true });
            } catch (error) {
                console.error('Error submitting form:', error);
            } finally {
                isLoading = false;
            }
        }

        node.addEventListener('submit', handleSubmit);

        return {
            destroy() {
                node.removeEventListener('submit', handleSubmit);
            }
        };
    }
</script>

<div class="transactions-container">
    <!-- Transaction Filters Component -->
    <TransactionFilters 
        filters={filters}
        allCategories={allCategories}
        defaultFromDate={defaultFromDate}
        isVisible={isFiltersVisible}
        currentPage={currentPage}
        on:filterChange={handleFilterChange}
        on:clearFilters={handleClearFilters}
        on:toggleVisibility={() => isFiltersVisible = !isFiltersVisible}
    />

    <div class="transactions">
        {#if isLoading}
            <div class="flex justify-center items-center p-8">
                <div class="animate-spin inline-block size-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
        {:else}
            <!-- Mobile-friendly filter toggle button -->
            <div class="mb-4">
                <button 
                    type="button" 
                    class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                    class:bg-white={isFiltersVisible || activeFiltersCount === 0}
                    class:text-gray-800={isFiltersVisible || activeFiltersCount === 0}
                    class:dark:bg-slate-900={isFiltersVisible || activeFiltersCount === 0}
                    class:dark:border-gray-700={isFiltersVisible || activeFiltersCount === 0}
                    class:dark:text-white={isFiltersVisible || activeFiltersCount === 0}
                    class:bg-blue-100={!isFiltersVisible && activeFiltersCount > 0}
                    class:text-blue-800={!isFiltersVisible && activeFiltersCount > 0}
                    class:dark:bg-blue-900={!isFiltersVisible && activeFiltersCount > 0}
                    class:dark:border-blue-800={!isFiltersVisible && activeFiltersCount > 0}
                    class:dark:text-blue-200={!isFiltersVisible && activeFiltersCount > 0}
                    onclick={() => isFiltersVisible = !isFiltersVisible}
                >
                    <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    {isFiltersVisible ? 'Hide Filters' : 'Show Filters'}
                    {#if activeFiltersCount > 0}
                        <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{activeFiltersCount}</span>
                    {/if}
                </button>
            </div>

            <!-- Sort Controls Component -->
            <TransactionSortControls 
                filters={filters}
                on:sortChange={handleSortChange}
            />

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
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">No transactions found</h3>
                    <p class="text-gray-500 mt-1">Try adjusting your filters or adding new transactions</p>
                </div>
            {/if}
        {/if}
    </div>

</div>

<style>
    /* Tailwind classes handle all styling */
</style> 