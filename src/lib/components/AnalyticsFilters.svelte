<script lang="ts">
    import type { Category } from '$lib/types';
    import type { AnalyticsFilterState } from '$lib/types/filters';
    import { createEventDispatcher } from 'svelte';

    const props = $props<{
        filters: AnalyticsFilterState;
        allCategories?: Category[];
        defaultFromDate?: string;
        isVisible?: boolean;
    }>();

    // Set default values
    const allCategories = $derived(props.allCategories || []);
    const defaultFromDate = $derived(props.defaultFromDate || '');
    const isVisible = $derived(props.isVisible !== undefined ? props.isVisible : true);
    const filters = $derived(props.filters);

    const dispatch = createEventDispatcher<{
        filterChange: { filters: AnalyticsFilterState };
        clearFilters: void;
        toggleVisibility: void;
    }>();

    // Local state for dropdowns
    let isCategoriesDropdownOpen = $state(false);
    let isDateRangeOpen = $state(false);
    let isPeriodOpen = $state(false);

    function handleFilterChange() {
        dispatch('filterChange', { filters });
    }

    function clearFilters() {
        // Dispatch an event with the default filter state
        const defaultFilters = {
            type: { value: 'all' },
            dateRange: { from: defaultFromDate || '', to: '' },
            categories: { selected: [], isNegative: false },
            period: { value: 'month' },
            search: { value: '', isNegative: false }
        };
        
        // Dispatch a custom event with the default filters
        dispatch('filterChange', { filters: defaultFilters });
        
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
        props.filters.period.value = period;
        handleFilterChange();
    }

    // Count selected filters
    let activeFiltersCount = $state(0);
    
    $effect(() => {
        let count = 0;
        if (filters.type.value !== 'all') count++;
        if (filters.dateRange.from && filters.dateRange.from !== defaultFromDate) count++;
        if (filters.dateRange.to) count++;
        if (filters.categories.selected.length > 0) count++;
        if (filters.search.value) count++;
        activeFiltersCount = count;
    });
</script>

<div 
    class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-3 mb-4"
    class:hidden={!isVisible}
>
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

        <!-- Transaction Type Filter - Toggle Buttons -->
        <div>
            <div class="relative flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button 
                    type="button" 
                    class="relative flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1"
                    class:bg-white={filters.type.value === 'income'}
                    class:text-green-700={filters.type.value === 'income'}
                    class:shadow-sm={filters.type.value === 'income'}
                    class:dark:bg-slate-700={filters.type.value === 'income'}
                    class:dark:text-green-400={filters.type.value === 'income'}
                    class:text-gray-600={filters.type.value !== 'income'}
                    class:dark:text-gray-400={filters.type.value !== 'income'}
                    onclick={() => setTransactionType('income')}
                >
                    Income 🤑
                </button>
                <button 
                    type="button" 
                    class="relative flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1"
                    class:bg-white={filters.type.value === 'expense'}
                    class:text-red-700={filters.type.value === 'expense'}
                    class:shadow-sm={filters.type.value === 'expense'}
                    class:dark:bg-slate-700={filters.type.value === 'expense'}
                    class:dark:text-red-400={filters.type.value === 'expense'}
                    class:text-gray-600={filters.type.value !== 'expense'}
                    class:dark:text-gray-400={filters.type.value !== 'expense'}
                    onclick={() => setTransactionType('expense')}
                >
                    Expense 😭
                </button>
            </div>
        </div>

        <!-- Period Type Filter -->
        <div>
            <button 
                type="button" 
                class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                onclick={() => isPeriodOpen = !isPeriodOpen}
            >
                <span class="flex items-center gap-1">
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Period
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

        <!-- Date Range Dropdown -->
        <div>
            <button 
                type="button" 
                class="flex justify-between items-center w-full py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                onclick={() => isDateRangeOpen = !isDateRangeOpen}
            >
                <span class="flex items-center gap-1">
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Date Range
                    {#if filters.dateRange.from || filters.dateRange.to}
                        <span class="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Active
                        </span>
                    {/if}
                </span>
                <svg class="flex-shrink-0 size-3.5 transition-transform" class:rotate-180={isDateRangeOpen} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {#if isDateRangeOpen}
                <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-gray-700">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label for="date-from" class="block text-xs font-medium mb-1 dark:text-white">From</label>
                            <input 
                                id="date-from"
                                type="date" 
                                class="py-1 px-2 block w-full border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600"
                                bind:value={filters.dateRange.from}
                                onchange={handleFilterChange}
                            />
                        </div>
                        <div>
                            <label for="date-to" class="block text-xs font-medium mb-1 dark:text-white">To</label>
                            <input 
                                id="date-to"
                                type="date" 
                                class="py-1 px-2 block w-full border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600"
                                bind:value={filters.dateRange.to}
                                onchange={handleFilterChange}
                            />
                        </div>
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
                    <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
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
                    <div class="mb-2">
                        <label class="flex items-center gap-2 text-xs font-medium dark:text-white">
                            <input 
                                type="checkbox" 
                                class="shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                bind:checked={filters.categories.isNegative}
                                onchange={handleFilterChange}
                            />
                            Exclude selected categories
                        </label>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto p-1">
                        {#each allCategories as category}
                            <label class="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    class="shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                    checked={filters.categories.selected.includes(category.id.toString())}
                                    onchange={() => toggleCategory(category.id.toString())}
                                />
                                <span class="text-xs dark:text-white">{category.name}</span>
                            </label>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div> 