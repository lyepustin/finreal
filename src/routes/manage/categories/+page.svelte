<script lang="ts">
    import type { PageData } from './$types';
    import type { Category, SubCategory } from '$lib/types';
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';

    let { data } = $props<{ data: PageData }>();
    let categories = $state(data.categories);
    let isLoading = $state(false);
    let editingCategory = $state<Category | null>(null);
    let editingSubcategory = $state<{ categoryId: number, subcategory: SubCategory | null }>(null);
    let deleteConfirmationOpen = $state(false);
    let itemToDelete = $state<{ type: 'category' | 'subcategory', id: number, name: string } | null>(null);
    let errorMessage = $state<string | null>(null);
    let toastMessage = $state<{ type: 'success' | 'error', text: string } | null>(null);
    let toastTimeout: NodeJS.Timeout | null = $state(null);
    let transactionCounts = $state<Map<number, { count: number, subcategories: Map<number, number> }>>(new Map());
    
    // Function to calculate total transactions for a category
    function getTotalTransactions(categoryId: number): number {
        const categoryData = transactionCounts.get(categoryId);
        if (!categoryData) return 0;

        // Sum direct category transactions and all subcategory transactions
        const subcategoryTotal = Array.from(categoryData.subcategories.values()).reduce((sum, count) => sum + count, 0);
        return categoryData.count + subcategoryTotal;
    }

    // Function to sort categories by total transactions
    function getSortedCategories(): Category[] {
        return [...categories].sort((a, b) => {
            const totalA = getTotalTransactions(a.id);
            const totalB = getTotalTransactions(b.id);
            return totalB - totalA;
        });
    }
    
    // Form states
    let newCategoryName = $state('');
    let newSubcategoryName = $state('');
    let selectedCategoryId = $state<number | null>(null);

    // Focus action
    function focusOnMount(node: HTMLElement) {
        node.focus();
        return {};
    }

    function handleEditCategory(category: Category) {
        editingCategory = { ...category };
    }

    function handleEditSubcategory(categoryId: number, subcategory: SubCategory | null = null) {
        editingSubcategory = { categoryId, subcategory: subcategory ? { ...subcategory } : null };
        selectedCategoryId = categoryId;
    }

    function handleDelete(item: Category | SubCategory) {
        if (!item) return;

        const isCategory = 'subcategories' in item;
        itemToDelete = {
            type: isCategory ? 'category' : 'subcategory',
            id: item.id,
            name: item.name
        };
        deleteConfirmationOpen = true;
    }

    function handleCancelEdit() {
        editingCategory = null;
        editingSubcategory = null;
        newCategoryName = '';
        newSubcategoryName = '';
        selectedCategoryId = null;
        errorMessage = null;
    }

    function cancelDelete() {
        deleteConfirmationOpen = false;
        itemToDelete = null;
    }

    async function confirmDelete() {
        if (!itemToDelete) return;
        
        try {
            isLoading = true;
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = itemToDelete.type === 'category' ? '?/deleteCategory' : '?/deleteSubcategory';
            
            const idInput = document.createElement('input');
            idInput.type = 'hidden';
            idInput.name = 'id';
            idInput.value = itemToDelete.id.toString();
            
            form.appendChild(idInput);
            document.body.appendChild(form);
            
            form.requestSubmit();
        } catch (error) {
            isLoading = false;
            showToast('error', error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }

    // Form submission handler
    function handleSubmit() {
        isLoading = true;
        
        return async ({ result }: { result: any }) => {
            isLoading = false;
            
            if (result.type === 'success') {
                handleCancelEdit();
                cancelDelete();
                if (result.data?.categories) {
                    categories = result.data.categories;
                }
                showToast('success', 'Changes saved successfully');
            } else if (result.type === 'error') {
                errorMessage = result.error?.message || 'An error occurred while saving';
                showToast('error', errorMessage);
            }
        };
    }

    // Toast helper function
    function showToast(type: 'success' | 'error', text: string) {
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        toastMessage = { type, text };
        toastTimeout = setTimeout(() => {
            toastMessage = null;
            toastTimeout = null;
        }, 5000);
    }

    // Fetch transaction counts on mount
    onMount(async () => {
        try {
            const response = await fetch('/api/category-transaction-counts');
            const data = await response.json();
            
            if (data.categories) {
                const countsMap = new Map();
                data.categories.forEach(category => {
                    countsMap.set(category.id, {
                        count: category.transactionCount,
                        subcategories: new Map(
                            category.subcategories.map(sub => [sub.id, sub.transactionCount])
                        )
                    });
                });
                transactionCounts = countsMap;
            }
        } catch (error) {
            console.error('Error fetching transaction counts:', error);
        }
    });
</script>

<div class="space-y-8">
    <!-- Categories Section -->
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
        <div class="p-4 md:p-5">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Categories
                </h2>
                <button
                    type="button"
                    class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                    onclick={() => handleEditCategory({ id: 0, name: '', subcategories: [] })}
                >
                    <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add Category
                </button>
            </div>

            <!-- Categories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {#each getSortedCategories() as category}
                    <!-- Category Card -->
                    <div class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                        <div class="p-4">
                            <!-- Category Name -->
                            <button
                                type="button"
                                class="w-full flex justify-between items-center mb-3 hover:text-blue-600 dark:hover:text-blue-400"
                                onclick={() => handleEditCategory(category)}
                            >
                                <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-semibold text-inherit">
                                        {category.name}
                                    </h3>
                                    <span class="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {getTotalTransactions(category.id)} transactions
                                    </span>
                                </div>
                                <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            
                            <!-- Subcategories -->
                            <div class="mt-2">
                                <div class="flex flex-wrap gap-1.5">
                                    {#each category.subcategories as subcategory}
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                                            onclick={() => handleEditSubcategory(category.id, subcategory)}
                                        >
                                            {subcategory.name}
                                            {#if transactionCounts.get(category.id)?.subcategories.get(subcategory.id)}
                                                <span class="ml-1 px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100">
                                                    {transactionCounts.get(category.id)?.subcategories.get(subcategory.id)}
                                                </span>
                                            {/if}
                                        </button>
                                    {/each}
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                                        onclick={() => handleEditSubcategory(category.id)}
                                    >
                                        <svg class="size-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    {#if deleteConfirmationOpen}
    <div 
        class="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-6 bg-transparent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
    >
        <!-- Backdrop -->
        <div 
            class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            aria-hidden="true" 
            onclick={cancelDelete}
            onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
            role="presentation"
        ></div>

        <!-- Modal Content -->
        <div class="relative bg-white dark:bg-slate-900 w-full h-auto sm:h-auto sm:w-[500px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden shadow-xl sm:rounded-2xl">
            <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 id="delete-modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete {itemToDelete?.type === 'category' ? 'Category' : 'Subcategory'}
                </h2>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onclick={cancelDelete}
                    aria-label="Close delete confirmation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                <div class="mb-6">
                    <p class="text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete {itemToDelete?.type === 'category' ? 'category' : 'subcategory'} "<span class="font-medium text-gray-900 dark:text-white">{itemToDelete?.name}</span>"? This action cannot be undone.
                    </p>
                </div>

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                        type="button"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                        onclick={cancelDelete}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:hover:bg-red-500"
                        onclick={confirmDelete}
                        disabled={isLoading}
                    >
                        {#if isLoading}
                            <div class="animate-spin inline-block size-4 border-[2px] border-current border-t-transparent text-white rounded-full mr-2" role="status" aria-label="loading"></div>
                            Deleting...
                        {:else}
                            Delete {itemToDelete?.type === 'category' ? 'Category' : 'Subcategory'}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
    {/if}

    <!-- Edit Category/Subcategory Modal -->
    {#if editingCategory || editingSubcategory}
    <div 
        class="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6 bg-transparent"
        role="dialog"
        aria-modal="true"
    >
        <!-- Backdrop -->
        <div 
            class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            aria-hidden="true"
            onclick={handleCancelEdit}
            onkeydown={(e) => e.key === 'Escape' && handleCancelEdit()}
            role="presentation"
        ></div>

        <!-- Modal Content -->
        <div class="relative bg-white dark:bg-slate-900 w-full h-auto sm:h-auto sm:w-[500px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden shadow-xl sm:rounded-2xl">
            <form 
                method="POST"
                action={editingCategory ? "?/upsertCategory" : "?/upsertSubcategory"}
                use:enhance={handleSubmit}
                class="flex flex-col h-full"
            >
                <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {#if editingCategory}
                            {editingCategory.id ? 'Edit Category' : 'New Category'}
                        {:else if editingSubcategory}
                            {editingSubcategory.subcategory ? 'Edit Subcategory' : 'New Subcategory'}
                        {/if}
                    </h2>
                    <button
                        type="button"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onclick={handleCancelEdit}
                        aria-label="Close edit form"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                    {#if errorMessage}
                        <div class="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                            {errorMessage}
                        </div>
                    {/if}

                    <!-- Hidden fields -->
                    {#if editingCategory}
                        <input type="hidden" name="id" value={editingCategory.id} />
                    {:else if editingSubcategory}
                        <input type="hidden" name="categoryId" value={editingSubcategory.categoryId} />
                        {#if editingSubcategory.subcategory}
                            <input type="hidden" name="id" value={editingSubcategory.subcategory.id} />
                        {/if}
                    {/if}
                    
                    <!-- Name Input -->
                    <div class="mb-4 sm:mb-6">
                        <label for="name" class="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            class="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
                            value={editingCategory ? editingCategory.name : editingSubcategory?.subcategory?.name ?? ''}
                            required
                            use:focusOnMount
                        />
                    </div>

                </div>

                <div class="flex-none p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                            onclick={handleCancelEdit}
                        >
                            Cancel
                        </button>

                        <!-- Delete Button with Tooltip -->
                        <div class="relative w-full sm:w-auto">
                            {#if (editingCategory && editingCategory.id && !editingCategory.subcategories?.length) || 
                                 (editingSubcategory?.subcategory?.id && 
                                  (!transactionCounts.get(editingSubcategory.categoryId)?.subcategories.get(editingSubcategory.subcategory.id) || 
                                   transactionCounts.get(editingSubcategory.categoryId)?.subcategories.get(editingSubcategory.subcategory.id) === 0))}
                                <button
                                    type="button"
                                    class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                    onclick={() => handleDelete(editingCategory || editingSubcategory?.subcategory)}
                                >
                                    Delete {editingCategory ? 'Category' : 'Subcategory'}
                                </button>
                            {:else}
                                <button
                                    type="button"
                                    class="tooltip-trigger w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed dark:text-gray-500 dark:bg-gray-800"
                                    disabled
                                >
                                    Delete {editingCategory ? 'Category' : 'Subcategory'}
                                </button>
                                <div class="tooltip absolute left-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg dark:bg-gray-700">
                                    {#if editingCategory && editingCategory.subcategories?.length}
                                        Cannot delete category because it has subcategories
                                    {:else if editingSubcategory?.subcategory?.id}
                                        Cannot delete subcategory because it has associated transactions
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <button
                            type="submit"
                            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500"
                            disabled={isLoading}
                        >
                            {#if isLoading}
                                <div class="animate-spin inline-block size-4 border-[2px] border-current border-t-transparent text-white rounded-full mr-2" role="status" aria-label="loading"></div>
                                Saving...
                            {:else}
                                Save Changes
                            {/if}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    {/if}

    <!-- Toast Message -->
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
</div>

<style>
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

    /* Add tooltip styles */
    .tooltip {
        visibility: hidden;
        opacity: 0;
        transition: visibility 0s, opacity 0.2s ease-in-out;
    }

    .tooltip-trigger:hover + .tooltip {
        visibility: visible;
        opacity: 1;
    }
</style> 