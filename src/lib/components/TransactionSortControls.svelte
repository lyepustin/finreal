<script lang="ts">
    import type { TransactionFilterState } from '$lib/types/filters';
    import { createEventDispatcher } from 'svelte';

    const { filters } = $props<{ 
        filters: TransactionFilterState 
    }>();

    const dispatch = createEventDispatcher<{
        sortChange: { column: TransactionFilterState['sort']['column'] };
    }>();

    function handleSort(column: TransactionFilterState['sort']['column']) {
        dispatch('sortChange', { column });
    }
</script>

<div class="flex flex-wrap gap-2 mb-4">
    <span class="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
    <button 
        type="button"
        onclick={() => handleSort('date')}
        class="py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
        class:bg-blue-100={filters.sort.column === 'date'}
        class:text-blue-800={filters.sort.column === 'date'}
        class:dark:bg-blue-900={filters.sort.column === 'date'}
        class:dark:text-blue-300={filters.sort.column === 'date'}
    >
        Date
        {#if filters.sort.column === 'date'}
            <span>{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
        {/if}
    </button>
    <button 
        type="button"
        onclick={() => handleSort('description')}
        class="py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
        class:bg-blue-100={filters.sort.column === 'description'}
        class:text-blue-800={filters.sort.column === 'description'}
        class:dark:bg-blue-900={filters.sort.column === 'description'}
        class:dark:text-blue-300={filters.sort.column === 'description'}
    >
        Description
        {#if filters.sort.column === 'description'}
            <span>{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
        {/if}
    </button>
    <button 
        type="button"
        onclick={() => handleSort('amount')}
        class="py-1 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
        class:bg-blue-100={filters.sort.column === 'amount'}
        class:text-blue-800={filters.sort.column === 'amount'}
        class:dark:bg-blue-900={filters.sort.column === 'amount'}
        class:dark:text-blue-300={filters.sort.column === 'amount'}
    >
        Amount
        {#if filters.sort.column === 'amount'}
            <span>{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
        {/if}
    </button>
</div> 