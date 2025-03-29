<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Category, SubCategory, Transaction } from '$lib/types';

    // Add the focusAtEnd action
    function focusAtEnd(node: HTMLInputElement) {
        if (node && typeof node.selectionStart !== 'undefined') {
            node.focus();
            node.selectionStart = node.selectionEnd = node.value.length;
        }
    }

    const { transaction, categories, isOpen = false } = $props<{
        transaction?: Transaction;
        categories?: Category[];
        isOpen?: boolean;
    }>();

    const dispatch = createEventDispatcher<{
        close: void;
        save: { 
            description: string;
            categories: { categoryId: number; subcategoryId: number | null; amount: number }[];
        };
        categorySelect: { categoryId: number; subcategoryId: number | null };
    }>();

    // Local state for the modal
    let selectedDescription = $state('');
    let selectedCategories = $state<{ categoryId: number; subcategoryId: number | null; amount: number }[]>([]);
    let transactionAmount = $state(0);
    let isLoading = $state(false);
    let errorMessage = $state<string | null>(null);
    // Add state for magic categorization loading
    let isMagicLoading = $state(false);

    // Add new state for category selection UI
    let isSelectingCategory = $state<number | null>(null); // Index of category being edited

    // Add state for category selection modal
    let categorySelectionModalOpen = $state(false);
    let editingCategoryIndex = $state<number | null>(null);

    // Add state for subcategory selection
    let selectedCategoryForSubcategories = $state<Category | null>(null);

    // Reset local state when the modal opens
    $effect(() => {
        if (isOpen && transaction) {
            selectedDescription = transaction.user_description || transaction.description || '';
            transactionAmount = transaction.categories?.reduce((sum, tc) => sum + (Number(tc.amount) || 0), 0) || 0;
            
            // Initialize categories with proper amounts
            if (transaction.categories?.length) {
                selectedCategories = transaction.categories.map(tc => ({
                    categoryId: tc.category.id,
                    subcategoryId: tc.subcategory?.id || null,
                    amount: Number(tc.amount) || 0
                }));
            } else if (categories?.length) {
                // If no categories, create one with the full amount
                selectedCategories = [{
                    categoryId: categories[0].id,
                    subcategoryId: categories[0].subcategories[0]?.id || null,
                    amount: transactionAmount
                }];
            }
        }
    });

    function handleClose() {
        errorMessage = null;
        dispatch('close');
    }

    function handleSave() {
        try {
            isLoading = true;
            errorMessage = null;
            
            if (!selectedCategories.length) {
                throw new Error('At least one category is required');
            }

            // Validate description is not empty
            if (!selectedDescription.trim()) {
                throw new Error('Description cannot be empty');
            }

            // Validate total amount matches
            if (!validateAmounts()) {
                throw new Error('Category amounts must sum up to the total transaction amount');
            }

            dispatch('save', {
                description: selectedDescription,
                categories: selectedCategories
            });
            handleClose();
        } catch (error) {
            console.error('Error in modal:', error);
            errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        } finally {
            isLoading = false;
        }
    }

    function addCategory() {
        if (!categories?.length) return;
        
        const firstCategory = categories[0];
        selectedCategories = [
            ...selectedCategories,
            {
                categoryId: firstCategory.id,
                subcategoryId: firstCategory.subcategories[0]?.id || null,
                amount: 0
            }
        ];
        distributeAmount();
    }

    function removeCategory(index: number) {
        if (selectedCategories.length <= 1) return;
        selectedCategories = selectedCategories.filter((_, i) => i !== index);
        distributeAmount();
    }

    function distributeAmount() {
        if (!selectedCategories?.length) return;
        
        const amountPerCategory = Number((transactionAmount / selectedCategories.length).toFixed(2));
        const remainder = Number((transactionAmount - (amountPerCategory * (selectedCategories.length - 1))).toFixed(2));
        
        selectedCategories = selectedCategories.map((cat, index) => ({
            ...cat,
            amount: index === 0 ? remainder : amountPerCategory
        }));
    }

    function startCategorySelection(index: number) {
        isSelectingCategory = index;
    }

    function selectCategory(categoryId: number, subcategoryId: number | null = null) {
        if (isSelectingCategory === null) return;
        
        const category = categories?.find(c => c.id === categoryId);
        if (!category) return;

        selectedCategories[isSelectingCategory] = {
            ...selectedCategories[isSelectingCategory],
            categoryId,
            subcategoryId
        };
        selectedCategories = [...selectedCategories];
        isSelectingCategory = null;
    }

    function updateAmount(index: number, newAmount: number) {
        // Get the original transaction sign (1 for positive, -1 for negative)
        const transactionSign = Math.sign(transactionAmount) || -1; // Default to -1 if 0
        
        // Convert to absolute value for storage
        const absAmount = Math.abs(newAmount);
        // Apply the original transaction's sign
        const finalAmount = absAmount * transactionSign;
        
        selectedCategories[index].amount = finalAmount;
        selectedCategories = [...selectedCategories];
        
        // Calculate remaining amount
        const totalAmount = selectedCategories.reduce((sum, cat) => sum + cat.amount, 0);
        const remaining = Number((transactionAmount - totalAmount).toFixed(2));
        
        // Show validation in UI
        validateAmounts();
    }

    function validateAmounts() {
        const totalAmount = selectedCategories.reduce((sum, cat) => sum + cat.amount, 0);
        // Compare absolute values to avoid sign issues
        if (Math.abs(Math.abs(totalAmount) - Math.abs(transactionAmount)) > 0.01) {
            errorMessage = `Amounts don't match. Difference: ${(Math.abs(transactionAmount) - Math.abs(totalAmount)).toFixed(2)}€`;
            return false;
        }
        errorMessage = null;
        return true;
    }

    function openCategorySelection(index: number) {
        editingCategoryIndex = index;
        categorySelectionModalOpen = true;
    }

    function handleCategorySelect(event: CustomEvent<{ categoryId: number; subcategoryId: number | null }>) {
        if (editingCategoryIndex === null) {
            return;
        }
        
        const { categoryId, subcategoryId } = event.detail;
        
        selectedCategories = selectedCategories.map((cat, index) => {
            return index === editingCategoryIndex 
                ? { ...cat, categoryId, subcategoryId }
                : cat;
        });
        
        categorySelectionModalOpen = false;
        editingCategoryIndex = null;
        selectedCategoryForSubcategories = null;
    }

    async function handleMagicCategorization() {
        if (!transaction || !categories?.length) return;
        
        try {
            isMagicLoading = true;
            errorMessage = null;
            
            const description = selectedDescription || transaction.description;
            
            // Call OpenAI API for prediction
            const response = await fetch('/api/transactions/predict-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionDescription: description
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to auto-categorize transaction');
            }
            
            const { data } = await response.json();
            
            if (!data || typeof data.categoryId !== 'number') {
                throw new Error('Invalid response from categorization service');
            }
            
            // Update the first category with the prediction
            if (selectedCategories.length > 0) {
                // If we have multiple categories, update just the first one
                selectedCategories = [
                    {
                        categoryId: data.categoryId,
                        subcategoryId: data.subcategoryId,
                        amount: selectedCategories[0].amount
                    },
                    ...selectedCategories.slice(1)
                ];
            } else if (categories.length > 0) {
                // If no categories are set, create one with the full amount
                selectedCategories = [{
                    categoryId: data.categoryId,
                    subcategoryId: data.subcategoryId,
                    amount: transactionAmount
                }];
            }
            
        } catch (error) {
            console.error('Error in magic categorization:', error);
            errorMessage = error instanceof Error ? error.message : 'Auto-categorization failed';
        } finally {
            isMagicLoading = false;
        }
    }
</script>

{#if isOpen}
<div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
>
    <!-- Backdrop -->
    <button
        type="button"
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onclick={handleClose}
        aria-label="Close modal"
    ></button>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-full max-w-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl rounded-lg">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 id="modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Transaction
            </h2>
            <button 
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={handleClose}
                disabled={isLoading}
                aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Error Message -->
        {#if errorMessage}
            <div class="p-4 sm:px-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
                <div class="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-sm font-medium">{errorMessage}</span>
                </div>
            </div>
        {/if}

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6">

            <!-- Description -->
            <div class="mb-5">
                <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                </label>
                <div class="relative">
                    <input
                        id="description"
                        type="text"
                        bind:value={selectedDescription}
                        onclick={(e) => {
                            const input = e.currentTarget;
                            input.selectionStart = input.selectionEnd = input.value.length;
                            // Ensure the end of the text is visible by scrolling
                            requestAnimationFrame(() => {
                                input.scrollLeft = input.scrollWidth;
                            });
                        }}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white pr-10"
                        placeholder="Enter description"
                    />
                    {#if selectedDescription}
                        <button
                            type="button"
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            onclick={() => selectedDescription = ''}
                            aria-label="Clear description"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    {/if}
                </div>
                
                <!-- Magic Button -->
                <div class="mt-2">
                    <button
                        type="button"
                        onclick={handleMagicCategorization}
                        disabled={isMagicLoading}
                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors duration-200 disabled:opacity-50"
                    >
                        {#if isMagicLoading}
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        {:else}
                            <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2l1.813 5.603a2 2 0 0 0 1.897 1.397h5.87l-4.741 3.47a2 2 0 0 0-.725 2.227l1.813 5.603-4.741-3.47a2 2 0 0 0-2.352 0l-4.741 3.47 1.813-5.603a2 2 0 0 0-.725-2.227l-4.741-3.47h5.87a2 2 0 0 0 1.897-1.397L12 2z"/>
                            </svg>
                            Magic
                        {/if}
                    </button>
                </div>
            </div>

            <!-- Categories -->
            <div class="my-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Categories
                    </h3>
                    <button 
                        type="button"
                        onclick={addCategory}
                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
                    >
                        Add Category
                    </button>
                </div>

                {#each selectedCategories as category, index}
                    <div class="flex items-center gap-3 rounded-lg my-2">
                        <!-- Category Button -->
                        <button
                            type="button"
                            onclick={() => openCategorySelection(index)}
                            class="flex-1 text-left px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 truncate"
                        >
                            {#if category.categoryId}
                                {#if category.subcategoryId}
                                    {categories?.find(c => c.id === category.categoryId)?.name} - 
                                    {categories?.find(c => c.id === category.categoryId)?.subcategories?.find(s => s.id === category.subcategoryId)?.name}
                                {:else}
                                    {categories?.find(c => c.id === category.categoryId)?.name}
                                {/if}
                            {:else}
                                Select a category...
                            {/if}
                        </button>

                        <!-- Amount Input -->
                        <div class="relative w-24 sm:w-32 flex-shrink-0">
                            <input
                                type="number"
                                step="0.01"
                                value={Math.abs(category.amount)}
                                oninput={(e) => updateAmount(index, e.currentTarget.valueAsNumber)}
                                class="w-full pl-2 pr-8 py-2 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                €
                            </span>
                        </div>

                        <!-- Remove Button -->
                        <button 
                            type="button"
                            onclick={() => removeCategory(index)}
                            disabled={selectedCategories.length <= 1}
                            class="flex-shrink-0 p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label={`Remove category ${index + 1}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                {/each}

            </div>
            <!-- Running Total -->
            <div class="flex justify-end p-2 rounded-lg">
                <span class="{(Math.abs(selectedCategories.reduce((sum, cat) => sum + cat.amount, 0) - Math.abs(transactionAmount)) > 0.01) ? 'text-red-600' : 'text-green-600'} font-medium">
                    {Math.abs(selectedCategories.reduce((sum, cat) => sum + cat.amount, 0)).toFixed(2)}€
                </span>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3">
            <button 
                type="button"
                onclick={handleSave}
                disabled={isLoading}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
                {#if isLoading}
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                {:else}
                    Save Changes
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}

<!-- Category Selection Modal -->
{#if categorySelectionModalOpen}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="category-selection-title"
>
    <!-- Backdrop -->
    <button
        type="button"
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onclick={() => {
            categorySelectionModalOpen = false;
            selectedCategoryForSubcategories = null;
        }}
        aria-label="Close category selection"
    ></button>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[400px] max-h-[50vh] m-4 flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="category-selection-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCategoryForSubcategories ? selectedCategoryForSubcategories.name : 'Select Category'}
            </h2>
            <div class="flex items-center gap-2">
                {#if selectedCategoryForSubcategories}
                    <button 
                        type="button"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onclick={() => selectedCategoryForSubcategories = null}
                        aria-label="Back to categories"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                {/if}
                <button 
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onclick={() => {
                        categorySelectionModalOpen = false;
                        selectedCategoryForSubcategories = null;
                    }}
                    aria-label="Close category selection"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto ">
            {#if !selectedCategoryForSubcategories}
                <!-- Categories List -->
                <div class="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                    {#each categories || [] as cat}
                        <button
                            type="button"
                            class="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 flex items-center justify-between"
                            onclick={() => {
                                if (!cat.subcategories?.length) {
                                    handleCategorySelect({ detail: { categoryId: cat.id, subcategoryId: null } } as CustomEvent);
                                } else {
                                    selectedCategoryForSubcategories = cat;
                                }
                            }}
                        >
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cat.name}</span>
                            {#if cat.subcategories?.length}
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
            {:else}
                <!-- Subcategories List -->
                <div class="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                    {#each selectedCategoryForSubcategories.subcategories || [] as subcat}
                        <button
                            type="button"
                            class="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 flex items-center justify-between"
                            onclick={() => {
                                handleCategorySelect({ 
                                    detail: { 
                                        categoryId: selectedCategoryForSubcategories.id, 
                                        subcategoryId: subcat.id 
                                    } 
                                } as CustomEvent);
                            }}
                        >
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{subcat.name}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>
{/if} 