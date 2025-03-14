<script lang="ts">
    import type { TransactionFilterState } from '$lib/types/filters';
    import type { Category } from '$lib/types';
    import { createEventDispatcher } from 'svelte';
    import CategoryFilterModal from './CategoryFilterModal.svelte';
    import SearchModal from './SearchModal.svelte';

    const { filters, categories } = $props<{ 
        filters: TransactionFilterState,
        categories: Category[]
    }>();

    let isCategoryModalOpen = $state(false);
    let isSearchModalOpen = $state(false);

    const dispatch = createEventDispatcher<{
        sortChange: { column: TransactionFilterState['sort']['column'] };
        typeChange: { type: 'all' | 'income' | 'expense' };
        categoryChange: { selected: string[], isNegative: boolean };
        searchChange: { searchTerm: string };
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
                return '💰 Mixed';
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

    function openCategoryModal() {
        isCategoryModalOpen = true;
    }

    function handleCategoryModalClose() {
        isCategoryModalOpen = false;
    }

    function handleCategoryChange(event: CustomEvent<{ selected: string[], isNegative: boolean }>) {
        dispatch('categoryChange', {
            selected: event.detail.selected,
            isNegative: event.detail.isNegative
        });
    }

    function getCategoryFilterLabel() {
        const count = filters.categories.selected.length;
        if (count === 0) {
            return '📂 Categories';
        }
        return `📂 Categories (${count})`;
    }

    function openSearchModal() {
        isSearchModalOpen = true;
    }

    function handleSearchModalClose() {
        isSearchModalOpen = false;
    }

    function handleSearchChange(event: CustomEvent<{ searchTerm: string }>) {
        dispatch('searchChange', {
            searchTerm: event.detail.searchTerm
        });
        isSearchModalOpen = false;
    }

    function getSearchLabel() {
        if (filters.searchTerm) {
            return `🔍 "${filters.searchTerm}"`;
        }
        return '🔍 Search';
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
            onclick={openCategoryModal}
            class="flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium text-center"
            class:bg-purple-50={filters.categories.selected.length > 0}
            class:text-purple-700={filters.categories.selected.length > 0}
            class:dark:bg-purple-900={filters.categories.selected.length > 0}
            class:dark:bg-opacity-20={filters.categories.selected.length > 0}
            class:dark:text-purple-400={filters.categories.selected.length > 0}
        >
            {getCategoryFilterLabel()}
        </button>
        <button 
            type="button"
            onclick={openSearchModal}
            class="flex-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 text-xs font-medium text-center"
            class:bg-yellow-50={filters.searchTerm}
            class:text-yellow-700={filters.searchTerm}
            class:dark:bg-yellow-900={filters.searchTerm}
            class:dark:bg-opacity-20={filters.searchTerm}
            class:dark:text-yellow-400={filters.searchTerm}
        >
            {getSearchLabel()}
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

<CategoryFilterModal 
    isOpen={isCategoryModalOpen}
    categories={categories}
    selectedCategories={filters.categories.selected}
    isNegative={filters.categories.isNegative}
    on:close={handleCategoryModalClose}
    on:apply={handleCategoryChange}
/>

<SearchModal
    isOpen={isSearchModalOpen}
    searchTerm={filters.searchTerm}
    on:close={handleSearchModalClose}
    on:apply={handleSearchChange}
/> 