<!-- CategorySelector.svelte -->
<script lang="ts">
    import type { Category } from '$lib/types';
    import { createEventDispatcher } from 'svelte';

    const { categories, selectedCategoryId = null, selectedSubcategoryId = null, isOpen = false } = $props<{
        categories: Category[];
        selectedCategoryId?: number | null;
        selectedSubcategoryId?: number | null;
        isOpen?: boolean;
    }>();

    const dispatch = createEventDispatcher<{
        select: { categoryId: number; subcategoryId: number | null };
        close: void;
    }>();

    let showingCategories = $state(true);
    let selectedCategoryForSubcategories = $state<Category | null>(null);

    function handleCategoryClick(category: Category) {
        if (!category.subcategories?.length) {
            dispatch('select', { categoryId: category.id, subcategoryId: null });
            dispatch('close');
            return;
        }
        showingCategories = false;
        selectedCategoryForSubcategories = category;
    }

    function handleSubcategorySelect(subcategoryId: number) {
        if (!selectedCategoryForSubcategories) return;
        dispatch('select', {
            categoryId: selectedCategoryForSubcategories.id,
            subcategoryId
        });
        dispatch('close');
        showingCategories = true;
        selectedCategoryForSubcategories = null;
    }

    function handleBackToCategories() {
        showingCategories = true;
        selectedCategoryForSubcategories = null;
    }

    function handleClose() {
        dispatch('close');
        showingCategories = true;
        selectedCategoryForSubcategories = null;
    }
</script>

{#if isOpen}
<div 
    class="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={handleClose}
        onkeydown={(e) => e.key === 'Escape' && handleClose()}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-full max-w-lg sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <!-- Header -->
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
                {#if !showingCategories}
                    <button 
                        type="button"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onclick={handleBackToCategories}
                        aria-label="Back to categories"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                {/if}
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {showingCategories ? 'Select Category' : selectedCategoryForSubcategories?.name}
                </h2>
            </div>
            <button 
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={handleClose}
                aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            {#if showingCategories}
                <!-- Categories List -->
                <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
                    {#each categories || [] as category}
                        <button
                            type="button"
                            class="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 flex items-center justify-between text-left"
                            onclick={() => handleCategoryClick(category)}
                        >
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{category.name}</span>
                            {#if category.subcategories?.length}
                                <svg 
                                    class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0 ml-2" 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                            {/if}
                        </button>
                    {/each}
                </div>
            {:else if selectedCategoryForSubcategories}
                <!-- Subcategories List -->
                <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
                    {#each selectedCategoryForSubcategories.subcategories || [] as subcategory}
                        <button
                            type="button"
                            class="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 flex items-center justify-between"
                            onclick={() => handleSubcategorySelect(subcategory.id)}
                        >
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{subcategory.name}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>
{/if} 