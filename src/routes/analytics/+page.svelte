<!-- Analytics page with bar chart -->
<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import BarChart from '$lib/components/BarChart.svelte';
    import CategoryCharts from '$lib/components/CategoryCharts.svelte';
    import TransactionFilters from '$lib/components/TransactionFilters.svelte';
    import { DEFAULT_ANALYTICS_FILTER_STATE } from '$lib/types/filters';
    import type { AnalyticsFilterState } from '$lib/types/filters';

    let { data } = $props<{ data: PageData }>();
    let chartData = $state(data.chartData);
    let categories = $state(data.categories);
    let defaultFromDate = $state(data.defaultFromDate);
    let defaultToDate = $state(data.defaultToDate);
    let isLoading = $state(false);
    let isFiltersVisible = $state(false);

    // Filter state
    let filters = $state<AnalyticsFilterState>({
        ...DEFAULT_ANALYTICS_FILTER_STATE,
        dateRange: {
            from: defaultFromDate,
            to: defaultToDate
        },
        period: {
            value: 'month' as const
        }
    });

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

    // Debounced filter handler
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    function handleFilterChange({ detail }: CustomEvent<{ filters: AnalyticsFilterState, currentPage: number }>) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Update local filters state with the received filters
            filters = detail.filters;
            
            // Submit the form
            document.getElementById('filter-form')?.requestSubmit();
        }, 300);
    }

    function handleClearFilters() {
        // Reset filters to default state
        filters = {
            ...DEFAULT_ANALYTICS_FILTER_STATE,
            dateRange: {
                from: defaultFromDate,
                to: defaultToDate
            },
            period: {
                value: 'month' as const
            }
        };
        
        document.getElementById('filter-form')?.requestSubmit();
    }

    // Form submission handler
    function handleFormSubmit() {
        isLoading = true;
        
        return async ({ result }: { result: any }) => {
            isLoading = false;
            
            if (result.type === 'success' && result.data?.data?.chartData) {
                chartData = result.data.data.chartData;
            }
        };
    }
</script>

<div class="analytics-container">
    <form 
        id="filter-form"
        method="POST"
        use:enhance={handleFormSubmit}
    >
        <input type="hidden" name="filters" value={JSON.stringify(filters)} />
        
        <!-- Transaction Filters Component -->
        <TransactionFilters 
            filters={filters}
            allCategories={categories}
            defaultFromDate={defaultFromDate}
            isVisible={isFiltersVisible}
            currentPage={1}
            on:filterChange={handleFilterChange}
            on:clearFilters={handleClearFilters}
            on:toggleVisibility={() => isFiltersVisible = !isFiltersVisible}
        />

        <!-- Mobile-friendly filter toggle button (only shown when filters are hidden) -->
        {#if !isFiltersVisible}
            <div class="mb-4">
                <button 
                    type="button" 
                    class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                    class:bg-white={activeFiltersCount === 0}
                    class:text-gray-800={activeFiltersCount === 0}
                    class:dark:bg-slate-900={activeFiltersCount === 0}
                    class:dark:border-gray-700={activeFiltersCount === 0}
                    class:dark:text-white={activeFiltersCount === 0}
                    class:bg-blue-100={activeFiltersCount > 0}
                    class:text-blue-800={activeFiltersCount > 0}
                    class:dark:bg-blue-900={activeFiltersCount > 0}
                    class:dark:border-blue-800={activeFiltersCount > 0}
                    class:dark:text-blue-200={activeFiltersCount > 0}
                    onclick={() => isFiltersVisible = true}
                >
                    <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Show Filters
                    {#if activeFiltersCount > 0}
                        <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{activeFiltersCount}</span>
                    {/if}
                </button>
            </div>
        {/if}
    </form>

    {#if isLoading}
        <div class="flex justify-center items-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
            <div class="animate-spin inline-block size-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
    {:else if chartData}
        <div class="space-y-4">
            <CategoryCharts chartData={chartData} />
            <BarChart 
                chartData={chartData}
                periodType={filters.period?.value || 'month'}
            />
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center p-8 text-center bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
            <svg class="size-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">No data available</h3>
            <p class="text-gray-500 mt-1">Try adjusting your filters or adding new transactions</p>
        </div>
    {/if}
</div>

<style>
    .analytics-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }
</style> 