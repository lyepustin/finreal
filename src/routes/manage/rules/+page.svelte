<script lang="ts">
    import type { PageData } from './$types';
    import type { Rule, Category } from '$lib/types';
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { derived as _derived } from 'svelte/store';
    import CategorySelector from '$lib/components/CategorySelector.svelte';

    let { data } = $props<{ data: PageData }>();
    
    // Initialize with empty arrays and then populate in onMount to ensure reactivity
    let rules = $state<Rule[]>([]);
    let categories = $state<Category[]>([]);
    let groupedCategories = $state<any[]>([]);
    
    let isLoading = $state(false);
    let editingRule = $state<Rule | null>(null);
    let errorMessage = $state<string | null>(null);
    let deleteConfirmationOpen = $state(false);
    let ruleToDelete = $state<Rule | null>(null);
    let applyRuleResult = $state<{ pattern: string; count: number } | null>(null);

    // Simple test of reactivity
    let testDerived = $derived(() => {
        return rules.length + categories.length;
    });

    // Category selection state
    let categorySelectionModalOpen = $state(false);
    let selectedCategoryForSubcategories = $state<Category | null>(null);
    let showingCategories = $state(true);
    let selectedCategory = $state<null | { id: number, name: string }>(null);
    let selectedSubcategory = $state<Category | null>(null);
    let isCategorySelectorOpen = $state(false);

    // Auto-select first subcategory when category changes
    $effect(() => {
        if (selectedCategory && !selectedSubcategory) {
            const selectedCategoryData = groupedCategories.find(c => c.id === selectedCategory.id);
            if (selectedCategoryData?.subcategories) {
                const firstSubcategoryWithRules = selectedCategoryData.subcategories.find(sub => sub.rules?.length > 0);
                if (firstSubcategoryWithRules) {
                    selectedSubcategory = firstSubcategoryWithRules;
                }
            }
        }
    });

    // Focus action
    function focusOnMount(node: HTMLElement) {
        node.focus();
        return {};
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (target.closest('.modal-content') === null) {
            if (editingRule) handleCancelEdit();
            if (deleteConfirmationOpen) cancelDelete();
            if (categorySelectionModalOpen) {
                categorySelectionModalOpen = false;
                selectedCategoryForSubcategories = null;
            }
        }
    }

    // Initialize data on mount to ensure reactivity
    onMount(() => {
        // Convert Proxy arrays to regular arrays and validate data structure
        if (Array.isArray(data.rules)) {
            const newRules = data.rules.map(rule => ({
                id: rule.id,
                pattern: rule.pattern,
                category_id: rule.category_id,
                subcategory_id: rule.subcategory_id,
                category: rule.category ? {
                    id: rule.category.id,
                    name: rule.category.name,
                    subcategories: rule.category.subcategories || []
                } : null,
                subcategory: rule.subcategory ? {
                    id: rule.subcategory.id,
                    name: rule.subcategory.name
                } : null
            }));
            rules = [...newRules];
        }

        if (Array.isArray(data.categories)) {
            const newCategories = data.categories.map(category => ({
                id: category.id,
                name: category.name,
                subcategories: (category.subcategories || []).map(sub => ({
                    id: sub.id,
                    name: sub.name
                }))
            }));
            categories = [...newCategories];
        }
    });

    // Compute grouped categories
    $effect(() => {
        if (!Array.isArray(rules) || !Array.isArray(categories) || !rules.length || !categories.length) {
            groupedCategories = [];
            return;
        }

        const rulesByCategoryId = new Map();
        rules.forEach(rule => {
            if (!rule.category_id) return;
            const categoryRules = rulesByCategoryId.get(rule.category_id) || [];
            categoryRules.push(rule);
            rulesByCategoryId.set(rule.category_id, categoryRules);
        });

        const grouped = categories.map(category => {
            const categoryRules = rulesByCategoryId.get(category.id) || [];
            const subcategories = (category.subcategories || []).map(subcategory => ({
                ...subcategory,
                rules: categoryRules.filter(rule => rule.subcategory_id === subcategory.id)
            }));

            return {
                ...category,
                rules: categoryRules.filter(rule => !rule.subcategory_id),
                subcategories,
                totalRules: categoryRules.length
            };
        });

        // Sort by total rules in descending order
        groupedCategories = grouped.sort((a, b) => b.totalRules - a.totalRules);
    });

    function handleCategoryClick(category: Category) {
        showingCategories = false;
        selectedCategory = {
            id: category.id,
            name: category.name
        };
    }

    function handleBackToCategories() {
        showingCategories = true;
        selectedCategory = null;
        selectedSubcategory = null;
    }

    function handleEditRule(rule?: Rule, preselectedCategory?: { id: number, name: string }, preselectedSubcategory?: Category | null) {
        // Find first category with subcategories for default
        const defaultCategory = categories.find(c => c.subcategories?.length > 0);
        const defaultSubcategory = defaultCategory?.subcategories?.[0];

        editingRule = rule ? { ...rule } : {
            pattern: '',
            category_id: preselectedCategory?.id || defaultCategory?.id || categories[0]?.id || 0,
            subcategory_id: preselectedSubcategory?.id || defaultSubcategory?.id || null,
            category: preselectedCategory || defaultCategory || categories[0] || null,
            subcategory: preselectedSubcategory || defaultSubcategory || null
        };
    }

    function handleCancelEdit() {
        editingRule = null;
        errorMessage = null;
    }

    function handleSave() {
        try {
            isLoading = true;
            errorMessage = null;
            
            if (!editingRule?.pattern) {
                throw new Error('Pattern is required');
            }

            if (!editingRule?.category_id) {
                throw new Error('Category is required');
            }

            document.getElementById('rule-form')?.requestSubmit();
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            isLoading = false;
        }
    }

    // Form submission handler
    function handleSubmit() {
        isLoading = true;
        
        return async ({ result }: { result: any }) => {
            isLoading = false;
            
            if (result.type === 'success') {
                if (result.data?.rules) {
                    rules = result.data.rules;
                    
                    // Recompute grouped categories with new rules
                    const rulesByCategoryId = new Map();
                    rules.forEach(rule => {
                        if (!rule.category_id) return;
                        const categoryRules = rulesByCategoryId.get(rule.category_id) || [];
                        categoryRules.push(rule);
                        rulesByCategoryId.set(rule.category_id, categoryRules);
                    });

                    const grouped = categories.map(category => {
                        const categoryRules = rulesByCategoryId.get(category.id) || [];
                        const subcategories = (category.subcategories || []).map(subcategory => ({
                            ...subcategory,
                            rules: categoryRules.filter(rule => rule.subcategory_id === subcategory.id)
                        }));

                        return {
                            ...category,
                            rules: categoryRules.filter(rule => !rule.subcategory_id),
                            subcategories,
                            totalRules: categoryRules.length
                        };
                    });

                    // Sort by total rules in descending order
                    groupedCategories = grouped.sort((a, b) => b.totalRules - a.totalRules);

                    // Update selected subcategory if it exists
                    if (selectedSubcategory && selectedCategory) {
                        const updatedCategory = grouped.find(c => c.id === selectedCategory.id);
                        if (updatedCategory) {
                            const updatedSubcategory = updatedCategory.subcategories.find(
                                sub => sub.id === selectedSubcategory.id
                            );
                            if (updatedSubcategory) {
                                selectedSubcategory = updatedSubcategory;
                            }
                        }
                    }
                }
                handleCancelEdit();
            } else if (result.type === 'error') {
                errorMessage = result.error?.message || 'An error occurred while saving';
            }
        };
    }

    function handleDelete(rule: Rule) {
        ruleToDelete = rule;
        deleteConfirmationOpen = true;
    }

    function handleDeleteModalBackdropClick(e: MouseEvent) {
        // Only close if clicking the backdrop itself, not its children
        if (e.target === e.currentTarget) {
            cancelDelete();
        }
    }

    function cancelDelete() {
        deleteConfirmationOpen = false;
        ruleToDelete = null;
    }

    function handleCategorySelect(event: CustomEvent<{ categoryId: number; subcategoryId: number | null }>) {
        if (!editingRule) return;
        
        const { categoryId, subcategoryId } = event.detail;
        const selectedCategory = categories.find(c => c.id === categoryId);
        const selectedSubcategory = selectedCategory?.subcategories?.find(s => s.id === subcategoryId) || null;
        
        editingRule = {
            ...editingRule,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            category: selectedCategory || null,
            subcategory: selectedSubcategory
        };
        
        categorySelectionModalOpen = false;
        selectedCategoryForSubcategories = null;
    }
</script>

<div class="flex flex-col min-h-screen">
    <!-- Sticky Header -->
    <div class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 sm:py-4">
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Transaction Rules
            </h2>
            <button
                type="button"
                class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                onclick={() => handleEditRule()}
                aria-label="Add new rule"
            >
                <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Add Rule
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-2 sm:p-4 sm:py-8">
        <div class="flow-root">
            <div class="rounded-lg dark:bg-slate-800">
                {#if showingCategories}
                    <!-- Categories Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-4">
                        {#each groupedCategories as category}
                            <!-- Category Card -->
                            <button 
                                type="button"
                                class="text-left group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md transition dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7] cursor-pointer"
                                onclick={() => handleCategoryClick(category)}
                                aria-label={`View ${category.name} rules`}
                            >
                                <div class="p-4">
                                    <!-- Category Name and Total Rules -->
                                    <div class="flex justify-between items-center mb-3">
                                        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
                                            {category.name}
                                        </h3>
                                        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {category.totalRules || 0} rules
                                        </span>
                                    </div>
                                    
                                    <!-- Rules without subcategory -->
                                    {#if category.rules?.length}
                                        <div class="mb-3">
                                            <div class="flex flex-wrap gap-1.5">
                                                {#each category.rules as rule}
                                                    <span
                                                        class="group relative inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                    >
                                                        {rule.pattern}
                                                    </span>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    <!-- Subcategories -->
                                    {#if category.subcategories?.length}
                                        <div class="mt-2">
                                            <div class="flex flex-wrap gap-1.5">
                                                {#each category.subcategories as subcategory}
                                                    {#if subcategory.rules?.length}
                                                        <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                            {subcategory.name}: {subcategory.rules.length} rules
                                                        </span>
                                                    {/if}
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- Category Detail Modal -->
{#if !showingCategories && selectedCategory}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-transparent"
    role="dialog"
    aria-modal="true"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={handleBackToCategories}
        onkeydown={(e) => e.key === 'Escape' && handleBackToCategories()}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <!-- Header -->
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedCategory.name}
                </h2>
            </div>
            <button 
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={handleBackToCategories}
                aria-label="Close rules list"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            {#if selectedCategory}
                {@const selectedCategoryData = groupedCategories.find(c => c.id === selectedCategory.id)}
                
                {#if selectedCategoryData?.subcategories}
                    <div class="m-4">
                        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <button
                                        type="button"
                                        class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                                        onclick={() => isCategorySelectorOpen = true}
                                    >
                                        <span>{selectedSubcategory?.name || 'Select Subcategory'}</span>
                                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm text-gray-500 dark:text-gray-400">
                                            {selectedSubcategory?.rules?.length || 0} rules
                                        </span>
                                        <button
                                            type="button"
                                            class="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                                            onclick={() => handleEditRule(undefined, selectedCategory, selectedSubcategory)}
                                            aria-label="Add new rule"
                                        >
                                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {#if selectedSubcategory}
                                <div class="p-4">
                                    <div class="space-y-2">
                                        {#each selectedSubcategory.rules as rule}
                                            <div class="flex items-center justify-between bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <button
                                                    type="button"
                                                    class="flex-grow text-left text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                                                    onclick={() => handleEditRule(rule)}
                                                >
                                                    {rule.pattern}
                                                </button>
                                                <div class="flex gap-2 ml-3">
                                                    <form
                                                        method="POST"
                                                        action="?/applyRule"
                                                        use:enhance={() => {
                                                            isLoading = true;
                                                            errorMessage = null;
                                                            return async ({ result }) => {
                                                                isLoading = false;
                                                                if (result.type === 'success') {
                                                                    if (result.data?.rules) {
                                                                        rules = result.data.rules;
                                                                        // Update the selected subcategory's rules if it exists
                                                                        if (selectedSubcategory) {
                                                                            selectedSubcategory = {
                                                                                ...selectedSubcategory,
                                                                                rules: rules.filter(rule => rule.subcategory_id === selectedSubcategory.id)
                                                                            };
                                                                        }
                                                                    }
                                                                    applyRuleResult = {
                                                                        pattern: rule.pattern,
                                                                        count: result.data.affectedCount
                                                                    };
                                                                } else if (result.type === 'error') {
                                                                    console.error('Apply rule error:', result.error);
                                                                    errorMessage = result.error?.message || 'An error occurred while applying the rule';
                                                                }
                                                            };
                                                        }}
                                                    >
                                                        <input type="hidden" name="id" value={rule.id} />
                                                        <button
                                                            type="submit"
                                                            class="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                                                            disabled={isLoading}
                                                            aria-label={`Apply rule ${rule.pattern}`}
                                                        >
                                                            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                        </button>
                                                    </form>
                                                    <button
                                                        type="button"
                                                        class="p-1 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                                                        onclick={() => handleDelete(rule)}
                                                        aria-label={`Delete rule ${rule.pattern}`}
                                                    >
                                                        <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <CategorySelector
                    categories={selectedCategoryData?.subcategories.map(sub => ({
                        id: sub.id,
                        name: sub.name,
                        subcategories: []
                    })) || []}
                    selectedCategoryId={selectedSubcategory?.id}
                    isOpen={isCategorySelectorOpen}
                    on:select={({ detail }) => {
                        const subcategory = selectedCategoryData?.subcategories.find(sub => sub.id === detail.categoryId);
                        if (subcategory) {
                            selectedSubcategory = subcategory;
                        }
                    }}
                    on:close={() => isCategorySelectorOpen = false}
                />
            {/if}
        </div>
    </div>
</div>
{/if}

<!-- Edit Rule Modal -->
{#if editingRule}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-transparent"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-modal-title"
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
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <form 
            id="rule-form"
            method="POST"
            action={editingRule.id ? "?/upsertRule" : "?/createRule"}
            use:enhance={handleSubmit}
            class="flex flex-col h-full"
        >
            <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 id="edit-modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingRule.id ? 'Edit Rule' : 'New Rule'}
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

                <input type="hidden" name="id" value={editingRule.id} />
                
                <!-- Pattern Input -->
                <div class="mb-4 sm:mb-6">
                    <label for="pattern" class="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Pattern</label>
                    <input
                        type="text"
                        id="pattern"
                        name="pattern"
                        class="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400"
                        bind:value={editingRule.pattern}
                        placeholder="Bar manolo"
                        required
                        use:focusOnMount
                    />
                </div>

                <!-- Category Selection -->
                <div class="mb-4 sm:mb-6">
                    <label for="category-selector" class="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Category</label>
                    <button
                        type="button"
                        id="category-selector"
                        onclick={() => categorySelectionModalOpen = true}
                        class="w-full text-left px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                        {#if editingRule.category_id}
                            {#if editingRule.subcategory_id}
                                {editingRule.category?.name} - {editingRule.subcategory?.name}
                            {:else}
                                {editingRule.category?.name}
                            {/if}
                        {:else}
                            Select a category...
                        {/if}
                    </button>
                    <input type="hidden" name="category_id" value={editingRule.category_id} />
                    <input type="hidden" name="subcategory_id" value={editingRule.subcategory_id || ''} />
                </div>
            </div>

            <div class="flex-none p-4 sm:p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700">
                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                        type="button"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                        onclick={handleCancelEdit}
                    >
                        Cancel
                    </button>
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

<!-- Delete Confirmation Modal -->
{#if deleteConfirmationOpen && ruleToDelete}
<div 
    class="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-transparent"
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
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="delete-modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Rule
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
                    Are you sure you want to delete the rule "<span class="font-medium text-gray-900 dark:text-white">{ruleToDelete.pattern}</span>"? This action cannot be undone.
                </p>
            </div>

            <form
                method="POST"
                action="?/deleteRule"
                use:enhance={() => {
                    isLoading = true;
                    return async ({ result }) => {
                        isLoading = false;
                        if (result.type === 'success') {
                            if (result.data?.rules) {
                                rules = result.data.rules;
                                // Update the selected subcategory's rules if it exists
                                if (selectedSubcategory) {
                                    selectedSubcategory = {
                                        ...selectedSubcategory,
                                        rules: rules.filter(rule => rule.subcategory_id === selectedSubcategory.id)
                                    };
                                }
                            }
                            cancelDelete();
                        } else if (result.type === 'error') {
                            errorMessage = result.error?.message || 'An error occurred while deleting';
                        }
                    };
                }}
            >
                <input type="hidden" name="id" value={ruleToDelete.id} />

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                        type="button"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                        onclick={cancelDelete}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:hover:bg-red-500"
                        disabled={isLoading}
                    >
                        {#if isLoading}
                            <div class="animate-spin inline-block size-4 border-[2px] border-current border-t-transparent text-white rounded-full mr-2" role="status" aria-label="loading"></div>
                            Deleting...
                        {:else}
                            Delete Rule
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
{/if}

<!-- Category Selection Modal -->
{#if categorySelectionModalOpen}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-transparent"
    role="dialog"
    aria-modal="true"
    aria-labelledby="category-selection-title"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={() => {
            categorySelectionModalOpen = false;
            selectedCategoryForSubcategories = null;
        }}
        onkeydown={(e) => {
            if (e.key === 'Escape') {
                categorySelectionModalOpen = false;
                selectedCategoryForSubcategories = null;
            }
        }}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <!-- Header -->
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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
                <h2 id="category-selection-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedCategoryForSubcategories ? selectedCategoryForSubcategories.name : 'Select Category'}
                </h2>
            </div>
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

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            {#if !selectedCategoryForSubcategories}
                <!-- Categories List -->
                <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
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
                <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
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

<!-- Apply Rule Result Modal -->
{#if applyRuleResult}
<div 
    class="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-transparent"
    role="dialog"
    aria-modal="true"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={() => applyRuleResult = null}
        onkeydown={(e) => e.key === 'Escape' && (applyRuleResult = null)}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Rule Applied
            </h2>
            <button
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={() => applyRuleResult = null}
                aria-label="Close result modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
            <p class="text-gray-600 dark:text-gray-300">
                The rule "<span class="font-medium text-gray-900 dark:text-white">{applyRuleResult.pattern}</span>" has been applied to <span class="font-medium text-gray-900 dark:text-white">{applyRuleResult.count}</span> transaction{applyRuleResult.count === 1 ? '' : 's'}.
            </p>

            <div class="mt-6 flex justify-end">
                <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                    onclick={() => applyRuleResult = null}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
</div>
{/if}

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