<script lang="ts">
    import type { Category } from '$lib/types';
    import type { TransactionFilterState, AnalyticsFilterState } from '$lib/types/filters';
    import { createEventDispatcher } from 'svelte';
    import DateRangeFilter from './DateRangeFilter.svelte';

    const props = $props<{
        filters: TransactionFilterState | AnalyticsFilterState;
        allCategories?: Category[];
        defaultFromDate?: string;
        isVisible?: boolean;
        currentPage?: number;
    }>();

    // Set default values
    const allCategories = $derived(props.allCategories || []);
    const defaultFromDate = $derived(props.defaultFromDate || '');
    const isVisible = $derived(props.isVisible !== undefined ? props.isVisible : true);
    const currentPage = $derived(props.currentPage || 1);
    const filters = $derived(props.filters);

    // Determine if we're in analytics mode (has period but no sort)
    const isAnalyticsMode = $derived('period' in filters && !('sort' in filters));

    const dispatch = createEventDispatcher<{
        filterChange: { filters: TransactionFilterState | AnalyticsFilterState, currentPage: number };
        clearFilters: void;
        toggleVisibility: void;
    }>();

    // Local state for dropdowns
    let isCategoriesDropdownOpen = $state(false);
    let isSubcategoriesDropdownOpen = $state(false);
    let isSearchOpen = $state(false);
    let isPeriodOpen = $state(false);

    function handleFilterChange() {
        dispatch('filterChange', { filters, currentPage: 1 });
    }

    function handleDateRangeChange(event: CustomEvent<{ from: string; to: string }>) {
        props.filters.dateRange = event.detail;
        handleFilterChange();
    }

    function clearFilters() {
        // Instead of directly modifying props, dispatch an event with the default filter state
        let defaultFilters;
        
        if (isAnalyticsMode) {
            defaultFilters = {
                type: { value: 'all' },
                dateRange: { from: defaultFromDate || '', to: '' },
                categories: { selected: [], isNegative: false },
                subcategories: { selected: [] },
                search: { value: '', isNegative: false },
                period: { value: 'month' as const }
            };
        } else {
            defaultFilters = {
                type: { value: 'all' },
                dateRange: { from: defaultFromDate || '', to: '' },
                categories: { selected: [], isNegative: false },
                subcategories: { selected: [] },
                search: { value: '', isNegative: false },
                sort: { column: 'date', direction: 'desc' }
            };
        }
        
        // Dispatch a custom event with the default filters
        dispatch('filterChange', { filters: defaultFilters, currentPage: 1 });
        
        // Also dispatch the clearFilters event for any additional handling
        dispatch('clearFilters');
    }

    function toggleVisibility() {
        dispatch('toggleVisibility');
    }

    function toggleCategory(categoryId: string) {
        const index = filters.categories.selected.indexOf(categoryId);
        if (index === -1) {
            props.filters.categories.selected = [...filters.categories.selected, categoryId];
        } else {
            props.filters.categories.selected = filters.categories.selected.filter(id => id !== categoryId);
        }
        
        if (filters.categories.selected.length > 0) {
            props.filters.subcategories.selected = filters.subcategories.selected.filter(subId => {
                const subcategory = allCategories
                    .find(cat => cat.subcategories.some(sub => sub.id.toString() === subId));
                return subcategory && filters.categories.selected.includes(subcategory.id.toString());
            });
        }
        handleFilterChange();
    }

    function toggleSubcategory(subcategoryId: string) {
        const index = filters.subcategories.selected.indexOf(subcategoryId);
        if (index === -1) {
            props.filters.subcategories.selected = [...filters.subcategories.selected, subcategoryId];
        } else {
            props.filters.subcategories.selected = filters.subcategories.selected.filter(id => id !== subcategoryId);
        }
        handleFilterChange();
    }

    function setTransactionType(type: 'all' | 'income' | 'expense') {
        // If the same type is clicked again, set it back to 'all'
        if (filters.type.value === type) {
            props.filters.type.value = 'all';
        } else {
            props.filters.type.value = type;
        }
        handleFilterChange();
    }

    function setPeriod(period: 'month' | 'week') {
        if (!props.filters.period) {
            // Initialize period if it doesn't exist
            (props.filters as any).period = { value: period };
        } else {
            props.filters.period.value = period;
        }
        handleFilterChange();
    }

    $effect(() => {
        if (filters.categories.isNegative) {
            props.filters.subcategories.selected = [];
        }
    });

    // Count selected filters
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
    
    // Update hidden form inputs when filters change
    $effect(() => {
        // This effect ensures the form inputs are updated when filters change
        // from the parent component (e.g., when clearing filters)
        const filterForm = document.getElementById('filter-form') as HTMLFormElement;
        if (filterForm) {
            // The form will be submitted by the parent component
            // This effect just ensures the hidden inputs are updated
        }
    });
</script>

<form 
    id="filter-form"
    method="GET"
    action="/transactions"
    class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-3 mb-4"
    class:hidden={!isVisible}
>
    {#each Object.entries(filters) as [key, value]}
        {#if typeof value === 'object' && value !== null}
            {#each Object.entries(value) as [subKey, subValue]}
                {#if key === 'dateRange' && subKey === 'from' && subValue}
                    <input type="hidden" name="dateFrom" value={subValue?.toString() || ''} />
                {:else if key === 'dateRange' && subKey === 'to' && subValue}
                    <input type="hidden" name="dateTo" value={subValue?.toString() || ''} />
                {:else if Array.isArray(subValue)}
                    {#each subValue as item}
                        <input type="hidden" name={`${key}.${subKey}[]`} value={item} />
                    {/each}
                {:else if typeof subValue === 'boolean'}
                    <input type="hidden" name={`${key}.${subKey}`} value={subValue ? 'true' : 'false'} />
                {:else if key !== 'dateRange'}
                    <input type="hidden" name={`${key}.${subKey}`} value={subValue?.toString() || ''} />
                {/if}
            {/each}
        {/if}
    {/each}
    <input type="hidden" name="page" value={currentPage} />
    
    <div class="space-y-3">
        <!-- Filter Header with Active Filters Count -->
        <div class="flex justify-between items-center border-b border-gray-200 pb-2 dark:border-gray-700">
            <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-gray-800 dark:text-white">Filters</h3>
                {#if activeFiltersCount > 0}
                    <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {activeFiltersCount}
                    </span>
                {/if}
            </div>
            <div class="flex gap-2">
                <button 
                    type="button" 
                    class="py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-lg border border-red-200 bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:pointer-events-none dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30"
                    onclick={clearFilters}
                >
                    <svg class="flex-shrink-0 size-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    Clear
                </button>
                <button 
                    type="button" 
                    class="py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                    onclick={toggleVisibility}
                >
                    <svg class="flex-shrink-0 size-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Hide Filters
                </button>
            </div>
        </div>

        <!-- Date Range Filter Component -->
        <DateRangeFilter dateRange={filters.dateRange} on:change={handleDateRangeChange} />

        <!-- Period Dropdown (for Analytics) -->
        {#if filters.period}
        <div>
            <button 
                type="button" 
                class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                onclick={() => isPeriodOpen = !isPeriodOpen}
            >
                <span class="flex items-center gap-1">
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Period: {filters.period.value === 'month' ? 'Monthly' : 'Weekly'}
                </span>
                <svg class="flex-shrink-0 size-3.5 transition-transform" class:rotate-180={isPeriodOpen} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {#if isPeriodOpen}
                <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-gray-700">
                    <div class="relative flex p-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <button 
                            type="button" 
                            class="relative flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1"
                            class:bg-white={filters.period.value === 'month'}
                            class:text-blue-700={filters.period.value === 'month'}
                            class:shadow-sm={filters.period.value === 'month'}
                            class:dark:bg-slate-600={filters.period.value === 'month'}
                            class:dark:text-blue-400={filters.period.value === 'month'}
                            class:text-gray-600={filters.period.value !== 'month'}
                            class:dark:text-gray-400={filters.period.value !== 'month'}
                            onclick={() => setPeriod('month')}
                        >
                            Monthly
                        </button>
                        <button 
                            type="button" 
                            class="relative flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1"
                            class:bg-white={filters.period.value === 'week'}
                            class:text-blue-700={filters.period.value === 'week'}
                            class:shadow-sm={filters.period.value === 'week'}
                            class:dark:bg-slate-600={filters.period.value === 'week'}
                            class:dark:text-blue-400={filters.period.value === 'week'}
                            class:text-gray-600={filters.period.value !== 'week'}
                            class:dark:text-gray-400={filters.period.value !== 'week'}
                            onclick={() => setPeriod('week')}
                        >
                            Weekly
                        </button>
                    </div>
                </div>
            {/if}
        </div>
        {/if}

        <!-- Search Dropdown -->
        <div>
            <button 
                type="button" 
                class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                onclick={() => isSearchOpen = !isSearchOpen}
            >
                <span class="flex items-center gap-1">
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Search
                    {#if filters.search.value}
                        <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Active
                        </span>
                    {/if}
                </span>
                <svg class="flex-shrink-0 size-3.5 transition-transform" class:rotate-180={isSearchOpen} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {#if isSearchOpen}
                <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-gray-700">
                    <div class="space-y-2">
                        <div>
                            <input 
                                id="search"
                                type="text" 
                                class="py-1 px-2 block w-full border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600"
                                bind:value={filters.search.value}
                                oninput={handleFilterChange}
                                placeholder="Description contains..."
                            />
                        </div>
                        <label class="flex items-center gap-x-2 text-xs">
                            <input 
                                type="checkbox" 
                                class="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                bind:checked={filters.search.isNegative}
                                onchange={handleFilterChange}
                            />
                            <span class="text-gray-500 dark:text-gray-400">Exclude matching results</span>
                        </label>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Categories Dropdown -->
        <div>
            <button 
                type="button" 
                class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                onclick={() => isCategoriesDropdownOpen = !isCategoriesDropdownOpen}
            >
                <span class="flex items-center gap-1">
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                    Categories
                    {#if filters.categories.selected.length > 0}
                        <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {filters.categories.selected.length}
                        </span>
                    {/if}
                </span>
                <svg class="flex-shrink-0 size-3.5 transition-transform" class:rotate-180={isCategoriesDropdownOpen} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {#if isCategoriesDropdownOpen}
                <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-gray-700">
                    <div class="mb-2 flex items-center">
                        <label class="flex items-center gap-x-2 text-xs">
                            <input 
                                type="checkbox" 
                                class="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                bind:checked={filters.categories.isNegative}
                                onchange={handleFilterChange}
                            />
                            <span class="text-gray-500 dark:text-gray-400">Exclude selected categories</span>
                        </label>
                    </div>
                    <div class="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                        {#each allCategories as category}
                            <label class="inline-flex items-center gap-x-1 py-1 px-2 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-800 shadow-sm dark:bg-slate-900 dark:border-gray-700 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                class:bg-blue-100={filters.categories.selected.includes(category.id.toString())}
                                class:text-blue-800={filters.categories.selected.includes(category.id.toString())}
                                class:dark:bg-blue-900={filters.categories.selected.includes(category.id.toString())}
                                class:dark:text-blue-200={filters.categories.selected.includes(category.id.toString())}
                            >
                                <input 
                                    type="checkbox"
                                    class="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                    checked={filters.categories.selected.includes(category.id.toString())}
                                    onchange={() => toggleCategory(category.id.toString())}
                                />
                                {category.name}
                            </label>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Subcategories Dropdown (only shown when categories are selected and not in negative mode) -->
        {#if filters.categories.selected.length > 0 && !filters.categories.isNegative}
            <div>
                <button 
                    type="button" 
                    class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                    onclick={() => isSubcategoriesDropdownOpen = !isSubcategoriesDropdownOpen}
                >
                    <span class="flex items-center gap-1">
                        <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                        Subcategories
                        {#if filters.subcategories.selected.length > 0}
                            <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {filters.subcategories.selected.length}
                            </span>
                        {/if}
                    </span>
                    <svg class="flex-shrink-0 size-3.5 transition-transform" class:rotate-180={isSubcategoriesDropdownOpen} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                
                {#if isSubcategoriesDropdownOpen}
                    <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-gray-700">
                        <div class="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {#each allCategories.filter(cat => 
                                filters.categories.selected.includes(cat.id.toString())
                            ) as category}
                                {#each category.subcategories as subcategory}
                                    <label class="inline-flex items-center gap-x-1 py-1 px-2 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-800 shadow-sm dark:bg-slate-900 dark:border-gray-700 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                        class:bg-blue-100={filters.subcategories.selected.includes(subcategory.id.toString())}
                                        class:text-blue-800={filters.subcategories.selected.includes(subcategory.id.toString())}
                                        class:dark:bg-blue-900={filters.subcategories.selected.includes(subcategory.id.toString())}
                                        class:dark:text-blue-200={filters.subcategories.selected.includes(subcategory.id.toString())}
                                    >
                                        <input 
                                            type="checkbox"
                                            class="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                            checked={filters.subcategories.selected.includes(subcategory.id.toString())}
                                            onchange={() => toggleSubcategory(subcategory.id.toString())}
                                        />
                                        {category.name} - {subcategory.name}
                                    </label>
                                {/each}
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</form>

<style>
    /* Tailwind classes handle all styling */
</style> 