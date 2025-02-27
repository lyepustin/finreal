<script lang="ts">
    import type { PageData } from './$types'
    import type { Category, SubCategory } from '$lib/types'
    import type { CategoryFilters } from '$lib/types/filters'
    import { goto, invalidate } from '$app/navigation'
    import { browser } from '$app/environment'
    import TransactionPagination from '$lib/components/TransactionPagination.svelte'
    import DateRangeFilter from '$lib/components/DateRangeFilter.svelte'
    import { isEqual } from 'lodash'

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(data.currentPage);
    let filters = $state<CategoryFilters>(data.filters);
    let isUpdating = $state(false);
    
    // Initialize default dates if not provided
    $effect(() => {
        if (!browser || isUpdating) return;
        
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const defaultFilters = {
            ...filters,
            dateRange: {
                from: filters.dateRange.from || firstDayOfMonth.toISOString().split('T')[0],
                to: filters.dateRange.to || lastDayOfMonth.toISOString().split('T')[0]
            }
        };
        
        if (!isEqual(filters, defaultFilters)) {
            isUpdating = true;
            filters = defaultFilters;
            updateURL();
            isUpdating = false;
        }
    });
    
    const { categoriesData, totalPages, categories: allCategories } = $derived({
        categoriesData: data.categoriesData,
        totalPages: data.totalPages,
        categories: data.categories
    });

    function handlePageChange({ detail }: CustomEvent<{ page: number }>) {
        // Validate page number
        if (detail.page < 1 || detail.page > totalPages) {
            return;
        }
        currentPage = detail.page;
        updateURL();
    }

    function handleCategoryClick(categoryId: number, total: number) {
        // Create URL params object
        const params = new URLSearchParams();
        
        // Add the category in the correct format
        params.append('categories.selected[]', categoryId.toString());
        
        // Add sorting parameters - direction based on whether it's income or expense
        params.set('sort.column', 'amount');
        params.set('sort.direction', total >= 0 ? 'desc' : 'asc');
        params.set('page', '1');
        
        // Preserve date range if it exists with correct parameter names
        if (filters.dateRange.from) {
            params.set('dateRange.from', filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            params.set('dateRange.to', filters.dateRange.to);
        }

        // Navigate to transactions with the parameters
        goto(`/transactions?${params.toString()}`);
    }

    async function handleDateRangeChange({ detail: dateRange }: CustomEvent<CategoryFilters['dateRange']>) {
        if (isUpdating) return;
        
        isUpdating = true;
        filters = {
            ...filters,
            dateRange
        };

        // Update URL and invalidate data
        await updateURL();
        await invalidate('supabase:transactions');
        isUpdating = false;
    }

    async function updateURL() {
        if (!browser) return;
        
        const params = new URLSearchParams();
        
        // Add date range parameters
        if (filters.dateRange.from) {
            params.set('dateFrom', filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            params.set('dateTo', filters.dateRange.to);
        }
        
        // Add page parameter
        if (currentPage > 1) {
            params.set('page', currentPage.toString());
        }

        // Update URL without reloading the page
        await goto(`${window.location.pathname}?${params.toString()}`, { replaceState: true });
    }

    // Update data effect
    $effect(() => {
        if (data.categoriesData) {
            isUpdating = true;
            currentPage = data.currentPage;
            filters = data.filters;
            isUpdating = false;
        }
    });
</script>

<div class="categories-container">
    <div class="mb-4">
        <DateRangeFilter 
            dateRange={filters.dateRange}
            on:change={handleDateRangeChange}
        />
    </div>

    <div class="categories">
        {#if categoriesData?.length}
            <!-- Card-based category list -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each categoriesData.filter(category => category.total !== 0) as categoryData}
                    <!-- Category Card -->
                    <div 
                        class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md transition dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]"
                        onclick={() => handleCategoryClick(categoryData.id, categoryData.total)}
                        onkeydown={(e) => e.key === 'Enter' && handleCategoryClick(categoryData.id, categoryData.total)}
                        tabindex="0"
                        role="button"
                        aria-label="View category transactions"
                    >
                        <div class="p-4 md:p-5">
                            <!-- Category Name and Total Amount -->
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
                                    {categoryData.name}
                                </h3>
                                {#if categoryData.total < 0}
                                    <span class="text-xl font-semibold text-red-600 dark:text-red-400">
                                        {categoryData.total.toFixed(2)} €
                                    </span>
                                {:else}
                                    <span class="text-xl font-semibold text-green-600 dark:text-green-400">
                                        {categoryData.total.toFixed(2)} €
                                    </span>
                                {/if}
                            </div>
                            

                            <!-- Subcategories Summary -->
                            {#if categoryData.subcategories?.length}
                                <div class="mt-4">
                                    <div class="flex flex-wrap gap-1.5">
                                        {#each categoryData.subcategories as subcategory}
                                            <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-800 dark:bg-slate-800 dark:border-gray-700 dark:text-gray-300">
                                                {subcategory.transactionCount} {subcategory.name}: {subcategory.total} €
                                            </span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
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
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">No categories found</h3>
                <p class="text-gray-500 mt-1">Try adding new transactions</p>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Tailwind classes handle all styling */
</style> 