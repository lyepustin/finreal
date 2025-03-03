<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Category } from '$lib/types';

    const { categories = [], selectedCategories = [], isNegative = false, isOpen = false } = $props<{
        categories?: Category[];
        selectedCategories?: string[];
        isNegative?: boolean;
        isOpen?: boolean;
    }>();

    const dispatch = createEventDispatcher<{
        close: void;
        apply: { selected: string[]; isNegative: boolean };
    }>();

    // Local state for the modal
    let localSelectedCategories = $state<string[]>([...selectedCategories]);
    let localIsNegative = $state<boolean>(isNegative);

    // Reset local state when the modal opens
    $effect(() => {
        if (isOpen) {
            localSelectedCategories = [...selectedCategories];
            localIsNegative = isNegative;
        }
    });

    function toggleCategory(categoryId: number) {
        const id = categoryId.toString();
        if (localSelectedCategories.includes(id)) {
            localSelectedCategories = localSelectedCategories.filter(c => c !== id);
        } else {
            localSelectedCategories = [...localSelectedCategories, id];
        }
    }

    function toggleFilterType() {
        localIsNegative = !localIsNegative;
    }

    function resetCategories() {
        localSelectedCategories = [];
        // Automatically apply and close the modal
        handleApply();
    }

    function handleClose() {
        dispatch('close');
    }

    function handleApply() {
        dispatch('apply', {
            selected: localSelectedCategories,
            isNegative: localIsNegative
        });
        handleClose();
    }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-md w-full max-h-[80vh] flex flex-col">
        <!-- Header with Apply Button -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Filter by Categories
            </h2>
            <div class="flex items-center gap-2">
                <button 
                    type="button"
                    class="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
                    onclick={handleApply}
                >
                    Apply Filters
                </button>
                <button 
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onclick={handleClose}
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Filter Type Toggle and Reset Button -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter mode:
                </span>
                <div class="flex items-center gap-2">
                    <button 
                        type="button"
                        class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        onclick={resetCategories}
                        disabled={localSelectedCategories.length === 0}
                        class:opacity-50={localSelectedCategories.length === 0}
                        class:cursor-not-allowed={localSelectedCategories.length === 0}
                    >
                        🔄 Reset
                    </button>
                    <button 
                        type="button"
                        class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200"
                        class:bg-blue-100={!localIsNegative}
                        class:text-blue-700={!localIsNegative}
                        class:bg-red-100={localIsNegative}
                        class:text-red-700={localIsNegative}
                        class:dark:bg-blue-900={!localIsNegative}
                        class:dark:text-blue-400={!localIsNegative}
                        class:dark:bg-red-900={localIsNegative}
                        class:dark:text-red-400={localIsNegative}
                        onclick={toggleFilterType}
                    >
                        {localIsNegative ? '❌ Exclude selected' : '✅ Include selected'}
                    </button>
                </div>
            </div>
            {#if localSelectedCategories.length > 0}
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {localSelectedCategories.length} {localSelectedCategories.length === 1 ? 'category' : 'categories'} selected
            </div>
            {/if}
        </div>

        <!-- Category List -->
        <div class="overflow-y-auto flex-grow p-4">
            <div class="space-y-2">
                {#if categories.length === 0}
                    <p class="text-gray-500 dark:text-gray-400 text-center py-4">No categories available</p>
                {:else}
                    {#each categories as category}
                        <div 
                            class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors duration-200"
                            class:bg-blue-50={localSelectedCategories.includes(category.id.toString())}
                            class:dark:bg-blue-900={localSelectedCategories.includes(category.id.toString())}
                            class:dark:bg-opacity-20={localSelectedCategories.includes(category.id.toString())}
                            onclick={() => toggleCategory(category.id)}
                        >
                            <div class="flex items-center justify-between">
                                <span class="font-medium text-gray-800 dark:text-gray-200">
                                    {category.name}
                                </span>
                                {#if localSelectedCategories.includes(category.id.toString())}
                                    <span class="text-blue-600 dark:text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </span>
                                {/if}
                            </div>
                            {#if category.subcategories && category.subcategories.length > 0}
                                <div class="mt-2 pl-4 text-xs text-gray-500 dark:text-gray-400">
                                    {category.subcategories.length} subcategories
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>
{/if} 