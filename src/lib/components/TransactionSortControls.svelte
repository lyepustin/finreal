<script lang="ts">
    import type { TransactionFilterState } from '$lib/types/filters';
    import { createEventDispatcher } from 'svelte';

    const { filters } = $props<{ 
        filters: TransactionFilterState 
    }>();

    const dispatch = createEventDispatcher<{
        sortChange: { column: TransactionFilterState['sort']['column'] };
        typeChange: { type: 'all' | 'income' | 'expense' };
    }>();

    function handleSort(column: TransactionFilterState['sort']['column']) {
        dispatch('sortChange', { column });
    }

    function cycleTransactionType() {
        const currentType = filters.type.value;
        let newType: 'all' | 'income' | 'expense';
        
        // Cycle through: all -> income -> expense -> all
        if (currentType === 'all') {
            newType = 'income';
        } else if (currentType === 'income') {
            newType = 'expense';
        } else {
            newType = 'all';
        }
        
        dispatch('typeChange', { type: newType });
    }

    function getTypeLabel() {
        switch (filters.type.value) {
            case 'income':
                return '🤑 Income';
            case 'expense':
                return '😭 Expense';
            default:
                return '💰 All';
        }
    }

    function getTypeClasses() {
        const baseClasses = "flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium text-center";
        
        switch (filters.type.value) {
            case 'income':
                return `${baseClasses} bg-gray-100 text-green-700 dark:bg-gray-800 dark:text-green-400`;
            case 'expense':
                return `${baseClasses} bg-gray-100 text-red-700 dark:bg-gray-800 dark:text-red-400`;
            default:
                return `${baseClasses} text-gray-700 dark:text-gray-300`;
        }
    }
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
    <div class="flex items-stretch divide-x divide-gray-200 dark:divide-gray-700">
        <button 
            type="button"
            onclick={cycleTransactionType}
            class="flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium text-center"
            class:bg-green-50={filters.type.value === 'income'}
            class:bg-red-50={filters.type.value === 'expense'}
            class:text-green-700={filters.type.value === 'income'}
            class:text-red-700={filters.type.value === 'expense'}
            class:dark:bg-green-800={filters.type.value === 'income'}
            class:dark:bg-red-800={filters.type.value === 'expense'}
            class:dark:bg-opacity-20={filters.type.value !== 'all'}
            class:dark:text-green-400={filters.type.value === 'income'}
            class:dark:text-red-400={filters.type.value === 'expense'}
        >
            {getTypeLabel()}
        </button>
        <button 
            type="button"
            onclick={() => handleSort('date')}
            class="flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium inline-flex items-center justify-center gap-1"
            class:bg-blue-100={filters.sort.column === 'date'}
            class:text-blue-700={filters.sort.column === 'date'}
            class:dark:bg-blue-900={filters.sort.column === 'date'}
            class:dark:text-blue-400={filters.sort.column === 'date'}
        >
            <span class="inline-flex items-center gap-1">
                📅 Date
            </span>
            {#if filters.sort.column === 'date'}
                <span class="text-xs">{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </button>
        <button 
            type="button"
            onclick={() => handleSort('amount')}
            class="flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium inline-flex items-center justify-center gap-1"
            class:bg-blue-100={filters.sort.column === 'amount'}
            class:text-blue-700={filters.sort.column === 'amount'}
            class:dark:bg-blue-900={filters.sort.column === 'amount'}
            class:dark:text-blue-400={filters.sort.column === 'amount'}
        >
            <span class="inline-flex items-center gap-1">
                💲 Amount
            </span>
            {#if filters.sort.column === 'amount'}
                <span class="text-xs">{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </button>
    </div>
</div> 