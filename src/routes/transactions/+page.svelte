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
    import TransactionEditModal from '$lib/components/TransactionEditModal.svelte'
    import type { Category } from '$lib/types'
    import * as transactionModel from '$lib/models/transactions'

    // Format currency
    function formatEuro(value: number): string {
        const roundedValue = Math.round(value);
        const formattedValue = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${formattedValue}€`;
    }

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(1);
    let filters = $state<TransactionFilterState>(DEFAULT_FILTER_STATE);
    let isLoading = $state(true);
    let isUpdating = $state(false);
    let isInitialized = $state(false);
    let urlParams = $state<{
        dateFrom: string | null;
        dateTo: string | null;
        categoryId: string | null;
        categoryName: string | null;
        typeValue: string;
        sortColumn: string;
        sortDirection: string;
        page: number;
    }>({
        dateFrom: null,
        dateTo: null,
        categoryId: null,
        categoryName: null,
        typeValue: 'all',
        sortColumn: 'date',
        sortDirection: 'desc',
        page: 1
    });
    let currentUrl = $state<URL | null>(null);
    let totals = $state({
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0
    });
    let lastTransactionId = $state('');
    let isFilterExpanded = $state(false);
    let showingCategories = $state(true);
    let selectedCategory = $state<null | { id: number, name: string }>(null);
    let categoryTotals = $state<Array<{
        category_id: number;
        category_name: string;
        total_amount: number;
        subcategories: Array<{
            id: number;
            name: string;
            amount: number;
            transactionCount: number;
        }>;
    }>>([]);
    let isEditModalOpen = $state(false);
    let selectedTransaction = $state<Transaction | null>(null);
    let categories = $state<Category[]>([]);

    // Add error toast state
    let toastMessage = $state<{ type: 'success' | 'error', text: string } | null>(null);
    let toastTimeout: NodeJS.Timeout | null = $state(null);

    // Initialize state and load data
    $effect(async () => {
        if (!browser || isInitialized || isUpdating) return;
        
        try {
            isLoading = true;
            
            // Get current URL parameters once
            const url = new URL(window.location.href);
            
            // Set default date range if needed (without updating URL)
            if (!url.searchParams.has('dateFrom') && !url.searchParams.has('dateTo')) {
                const defaultRange = getDefaultMonthDateRange();
                url.searchParams.set('dateFrom', defaultRange.from);
                url.searchParams.set('dateTo', defaultRange.to);
                history.replaceState(null, '', url);
            }
            
            // Update state based on URL parameters (one time)
            const params = {
                dateFrom: url.searchParams.get('dateFrom'),
                dateTo: url.searchParams.get('dateTo'),
                categoryId: url.searchParams.get('category'),
                categoryName: url.searchParams.get('categoryName'),
                typeValue: url.searchParams.get('type') || 'all',
                sortColumn: url.searchParams.get('sort.column') || 'date',
                sortDirection: url.searchParams.get('sort.direction') || 'desc',
                searchTerm: url.searchParams.get('searchTerm') || '',
                page: parseInt(url.searchParams.get('page') || '1')
            };

            // Update local state without triggering effects
            currentUrl = url;
            currentPage = params.page;
            showingCategories = !params.categoryId;
            
            if (params.categoryId && params.categoryName) {
                selectedCategory = {
                    id: parseInt(params.categoryId),
                    name: params.categoryName
                };
            }

            // Set filters without triggering updates
            filters = {
                ...DEFAULT_FILTER_STATE,
                type: { value: params.typeValue as 'all' | 'income' | 'expense' },
                dateRange: {
                    from: params.dateFrom || '',
                    to: params.dateTo || ''
                },
                categories: {
                    selected: params.categoryId ? [params.categoryId] : [],
                    isNegative: false
                },
                sort: {
                    column: params.sortColumn as any,
                    direction: params.sortDirection as 'asc' | 'desc'
                },
                searchTerm: params.searchTerm
            };

            // Fetch categories first
            const categoriesResponse = await fetch('/api/categories');
            const categoriesResult = await categoriesResponse.json();
            if (categoriesResult.categories) {
                categories = categoriesResult.categories;
            }

            // Mark as initialized before fetching data
            isInitialized = true;

            // Initial data fetch
            await Promise.all([
                showingCategories ? fetchCategoryTotals() : fetchTransactions(),
                fetchTotals()
            ]);
        } catch (error) {
            console.error('Error during initialization:', error);
        } finally {
            isLoading = false;
        }
    });

    // Function to fetch transactions
    async function fetchTransactions() {
        if (!isInitialized) return;

        const searchParams = new URLSearchParams();
        
        if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
        if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
        searchParams.set('sort.column', filters.sort.column);
        searchParams.set('sort.direction', filters.sort.direction);
        searchParams.set('type', filters.type.value);
        searchParams.set('page', currentPage.toString());
        
        if (filters.searchTerm) {
            searchParams.set('searchTerm', filters.searchTerm);
        }
        
        if (selectedCategory) {
            searchParams.set('category', selectedCategory.id.toString());
            searchParams.set('categoryName', selectedCategory.name);
        }
        
        if (filters.categories.selected.length > 0) {
            filters.categories.selected.forEach(categoryId => {
                searchParams.append('categories.selected[]', categoryId);
            });
            searchParams.set('categories.isNegative', filters.categories.isNegative.toString());
        }

        const response = await fetch(`/api/transactions/filtered?${searchParams.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            data = {
                ...data,
                transactions: result.data.transactions,
                totalCount: result.data.totalCount,
                currentPage: result.data.currentPage,
                totalPages: result.data.totalPages
            };
        }
    }

    // Function to fetch totals in the background
    async function fetchTotals() {
        if (!isInitialized) return;

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

    // Function to fetch category totals
    async function fetchCategoryTotals() {
        if (!isInitialized) return;

        try {
            const searchParams = new URLSearchParams();
            
            if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
            if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
            searchParams.set('type', filters.type.value);

            const response = await fetch(`/api/transactions/category-totals?${searchParams.toString()}`);
            const result = await response.json();
            
            if (result.success) {
                categoryTotals = result.data;
            }
        } catch (error) {
            console.error('Error fetching category totals:', error);
        }
    }

    function handleSortChange({ detail }: CustomEvent<{ column: TransactionFilterState['sort']['column'] }>) {
        // If clicking the same column, toggle direction
        if (filters.sort.column === detail.column) {
            filters.sort.direction = filters.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // If clicking a new column, set it with default desc direction
            filters.sort = {
                column: detail.column,
                direction: 'desc'
            };
        }
        currentPage = 1; // Reset to first page when sorting changes
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
        if (detail.page < 1 || detail.page > data.totalPages) return;
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
        console.log('Transaction clicked:', transaction);
        if (!transaction?.id) {
            console.error('Invalid transaction:', transaction);
            showToast('error', 'Invalid transaction data');
            return;
        }
        selectedTransaction = transaction;
        isEditModalOpen = true;
    }

    function handleCategoryClick(category: Category) {
        showingCategories = false;
        selectedCategory = {
            id: category.id,
            name: category.name
        };
        filters.categories.selected = [category.id.toString()];
        currentPage = 1;
        submitFilters();
    }

    function handleBackToCategories() {
        showingCategories = true;
        selectedCategory = null;
        filters.categories.selected = [];
        submitFilters();
    }

    async function handleSearchChange({ detail }: CustomEvent<{ searchTerm: string }>) {
        filters = {
            ...filters,
            searchTerm: detail.searchTerm
        };
        currentPage = 1;
        submitFilters();
    }

    async function submitFilters() {
        if (!browser || isUpdating) return;
        isLoading = true;
        isUpdating = true;

        try {
            // Create search params without updating URL immediately
            const searchParams = new URLSearchParams();
            
            // Add all filter parameters
            if (filters.dateRange.from) searchParams.set('dateFrom', filters.dateRange.from);
            if (filters.dateRange.to) searchParams.set('dateTo', filters.dateRange.to);
            searchParams.set('sort.column', filters.sort.column);
            searchParams.set('sort.direction', filters.sort.direction);
            searchParams.set('type', filters.type.value);
            searchParams.set('page', currentPage.toString());
            
            if (filters.searchTerm) {
                searchParams.set('searchTerm', filters.searchTerm);
            }
            
            if (selectedCategory) {
                searchParams.set('category', selectedCategory.id.toString());
                searchParams.set('categoryName', selectedCategory.name);
            }

            // Update URL only if it's different from current URL
            const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
            if (window.location.href !== newUrl) {
                history.pushState(null, '', newUrl);
                currentUrl = new URL(window.location.href);
            }

            // Fetch data based on current state, not URL
            await Promise.all([
                showingCategories ? fetchCategoryTotals() : fetchTransactions(),
                fetchTotals()
            ]);
        } catch (error) {
            console.error('Error updating filters:', error);
        } finally {
            isLoading = false;
            isUpdating = false;
        }
    }

    // Helper function to get active filters summary
    function getActiveFiltersSummary(): string {
        const typeValue = filters.type.value;
        const categoryCount = filters.categories.selected.length;
        let totalFilters = categoryCount;
        
        // Add type filter to count if it's not 'all'
        if (typeValue !== 'all') {
            totalFilters += 1;
        }
        
        // Add search filter to count if it exists
        if (filters.searchTerm) {
            totalFilters += 1;
        }
        
        // If we have any filters, show the count
        if (totalFilters > 0) {
            return `${totalFilters} filter${totalFilters > 1 ? 's' : ''}`;
        }
        
        // Default case when no filters are active
        return 'All';
    }

    async function handleTransactionSave({ detail }: CustomEvent<{ description: string; categories: { categoryId: number; subcategoryId: number | null; amount: number }[] }>) {
        if (!selectedTransaction?.id) {
            console.error('No transaction selected');
            showToast('error', 'No transaction selected. Please try again.');
            return;
        }

        const transactionId = selectedTransaction.id; // Store ID locally
        const oldDescription = selectedTransaction.user_description || selectedTransaction.description;

        console.log('Saving transaction:', {
            id: transactionId,
            oldDescription,
            newDescription: detail.description,
            categories: detail.categories
        });
        
        try {
            isLoading = true;
            
            // Update description if changed
            if (detail.description !== oldDescription) {
                console.log('Updating description from', oldDescription, 'to', detail.description);
                await transactionModel.updateTransactionDescription(transactionId, detail.description);
            }
            
            // Update categories
            console.log('Updating categories:', detail.categories);
            await transactionModel.updateTransactionCategories(transactionId, detail.categories);
            
            // Refresh data
            await Promise.all([
                showingCategories ? fetchCategoryTotals() : fetchTransactions(),
                fetchTotals()
            ]);

            // Show success message
            showToast('success', 'Transaction updated successfully');
            
            // Only clear state and close modal after everything is done
            isEditModalOpen = false;
            selectedTransaction = null;
        } catch (error) {
            console.error('Error updating transaction:', error);
            showToast('error', 'Failed to update transaction. Please try again.');
        } finally {
            isLoading = false;
        }
    }

    function handleModalClose() {
        isEditModalOpen = false;
        selectedTransaction = null;
    }

    // Add toast helper function
    function showToast(type: 'success' | 'error', text: string) {
        // Clear existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        // Show new toast
        toastMessage = { type, text };

        // Auto hide after 5 seconds
        toastTimeout = setTimeout(() => {
            toastMessage = null;
            toastTimeout = null;
        }, 5000);
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
                    hasUrlParams={!!(currentUrl && (currentUrl.searchParams.get('dateFrom') || currentUrl.searchParams.get('dateTo')))}
                    on:change={handleDateRangeChange}
                />
            </div>

            <!-- Summary Stats and Navigation -->
            <div class="summary-stats mb-2 md:mb-6">
                <div class="grid grid-cols-3 gap-2">
                    <!-- Left Button (Empty or Back) -->
                    {#if !showingCategories}
                        <button 
                            class="stat-card cursor-pointer transition-all duration-200 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50" 
                            onclick={handleBackToCategories}
                        >
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 flex items-center">
                                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m15 18-6-6 6-6"/>
                                </svg>
                                Back
                            </span>
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                                {selectedCategory?.name || 'All Categories'}
                            </span>
                        </button>
                    {:else}
                        <button 
                            class="stat-card cursor-pointer transition-all duration-200 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50" 
                            onclick={() => {
                                showingCategories = false;
                                selectedCategory = null;
                                filters.categories.selected = [];
                                submitFilters();
                            }}
                        >
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 flex items-center">
                                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 7h18M3 12h18M3 17h18"/>
                                </svg>
                                
                            </span>
                            <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 flex items-center ">
                                All Transactions
                            </span>
                        </button>
                    {/if}
                    
                    <!-- Middle Button (Totals) -->
                    <div class="stat-card bg-white dark:bg-slate-900 flex-col justify-center min-h-[52px]">
                        <div class="flex flex-col items-center gap-0.5">
                            {#if totals.totalIncome > Math.abs(totals.totalExpenses)}
                                <span class="text-xl font-semibold text-green-600 dark:text-green-400 leading-none">
                                    {formatEuro(totals.totalIncome)}
                                </span>
                                <span class="text-lg font-semibold text-red-600 dark:text-red-400 leading-none">
                                    {formatEuro(totals.totalExpenses)}
                                </span>
                            {:else}
                                <span class="text-xl font-semibold text-red-600 dark:text-red-400 leading-none">
                                    {formatEuro(totals.totalExpenses)}
                                </span>
                                <span class="text-lg font-semibold text-green-600 dark:text-green-400 leading-none">
                                    {formatEuro(totals.totalIncome)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Right Button (Sort/Filter) -->
                    <button 
                        class="stat-card cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50" 
                        class:active={isFilterExpanded}
                        onclick={() => isFilterExpanded = !isFilterExpanded}
                        aria-expanded={isFilterExpanded}
                        aria-controls="filter-section"
                    >
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Sort & Filter</span>
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getActiveFiltersSummary()}
                            </span>
                            <svg 
                                class="w-4 h-4 transform transition-transform duration-200" 
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
                    <TransactionSortControls 
                        filters={filters}
                        categories={categories}
                        on:sortChange={handleSortChange}
                        on:typeChange={handleTypeChange}
                        on:categoryChange={handleCategoryChange}
                        on:searchChange={handleSearchChange}
                    />
                </div>
            </div>
        </div>

        <!-- Scrollable Middle Section -->
        <div class="scrollable-content">
            {#if showingCategories}
                <!-- Categories Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                    {#each categoryTotals.filter(cat => 
                        filters.type.value === 'all' || 
                        (filters.type.value === 'income' && cat.total_amount > 0) ||
                        (filters.type.value === 'expense' && cat.total_amount < 0)
                    ) as category}
                        <!-- Category Card -->
                        <div 
                            class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md transition dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7] cursor-pointer"
                            onclick={() => handleCategoryClick({ id: category.category_id, name: category.category_name })}
                            onkeydown={(e) => e.key === 'Enter' && handleCategoryClick({ id: category.category_id, name: category.category_name })}
                            tabindex="0"
                            role="button"
                            aria-label="View transactions for {category.category_name}"
                        >
                            <div class="p-4">
                                <!-- Category Name and Total -->
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
                                        {category.category_name}
                                    </h3>
                                    <span class="text-base font-semibold {category.total_amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
                                        {formatEuro(category.total_amount)}
                                    </span>
                                </div>
                                
                                <!-- Subcategories -->
                                {#if category.subcategories?.length}
                                    <div class="mt-2">
                                        <div class="flex flex-wrap gap-1.5">
                                            {#each category.subcategories as subcategory}
                                                <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                    {subcategory.transactionCount} {subcategory.name}: {formatEuro(subcategory.amount)}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <!-- Transaction List -->
                {#if data.transactions?.length}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {#each data.transactions as transaction}
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
                                                {formatEuro(transaction.categories.reduce((sum, tc) => sum + tc.amount, 0))}
                                            </span>
                                        {:else}
                                            <span class="text-base font-semibold text-green-600 dark:text-green-400">
                                                {formatEuro(transaction.categories.reduce((sum, tc) => sum + tc.amount, 0))}
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
                                                <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                    {tc.category.name}
                                                    {#if tc.subcategory}
                                                        - {tc.subcategory.name} 
                                                        <span class="text-xs font-semibold {tc.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
                                                            {formatEuro(tc.amount)}
                                                        </span>
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
                            totalPages={data.totalPages}
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
            {/if}
        </div>
    </div>
</div>

<TransactionEditModal
    isOpen={isEditModalOpen}
    transaction={selectedTransaction}
    categories={categories}
    on:close={handleModalClose}
    on:save={handleTransactionSave}
/>

<!-- Add toast component at the bottom of the template -->
{#if toastMessage}
    <div 
        class="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-up"
        role="alert"
    >
        <div 
            class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium {
                toastMessage.type === 'success' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }"
        >
            <div class="flex items-center gap-2">
                {#if toastMessage.type === 'success'}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                {/if}
                {toastMessage.text}
            </div>
        </div>
    </div>
{/if}

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
            border-bottom: 1px solid rgb(229, 231, 235);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
        }

        .scrollable-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            -webkit-overflow-scrolling: touch;
            background-color: rgb(249, 250, 251);
        }

        /* Adjust stat cards for mobile */
        .summary-stats .stat-card {
            padding: 0.75rem;
        }

        /* Dark mode support */
        :global(.dark) .fixed-top {
            background-color: rgb(15, 23, 42);
            border-bottom-color: rgb(51, 65, 85);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        }

        :global(.dark) .scrollable-content {
            background-color: rgb(17, 24, 39);
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

    /* Add animation for toast */
    @keyframes fade-up {
        from {
            opacity: 0;
            transform: translate(-50%, 1rem);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    .animate-fade-up {
        animation: fade-up 0.2s ease-out;
    }
</style> 