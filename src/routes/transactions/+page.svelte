<script lang="ts">
    import type { PageData } from './$types'
    import type { Category, SubCategory } from '$lib/types'
    import { transactions } from '$lib/stores/transactions'
    import { enhance } from '$app/forms'
    import { goto } from '$app/navigation'
    import { browser } from '$app/environment'

    let { data } = $props<{ data: PageData }>();

    const { transactionsList, totalPages, currentPage, categories: allCategories } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        categories: data.categories
    });
    $inspect(transactionsList)
    let editingTransaction = $state<number | null>(null);
    let editDescription = $state('');

    // Filter state
    let filters = $state({
        type: { value: 'all', isNegative: false }, // 'all' | 'income' | 'expense'
        dateRange: { 
            from: '', 
            to: '', 
            isNegative: false 
        },
        categories: {
            selected: [] as string[],
            isNegative: false
        },
        subcategories: {
            selected: [] as string[],
            isNegative: false
        },
        search: {
            value: '',
            isNegative: false
        }
    });

    let isLoading = $state(false);
    let abortController: AbortController | null = $state(null);
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Derived categories and subcategories from transactions for filter options
    const categories = $derived(() => {
        if (!transactionsList?.length) {
            return {
                categories: [],
                subcategories: []
            };
        }

        const categoriesMap = new Map<number, Category>();
        const subcategoriesMap = new Map<number, SubCategory>();
        
        transactionsList.forEach(transaction => {
            transaction.categories?.forEach(tc => {
                if (tc.category) {
                    categoriesMap.set(tc.category.id, tc.category);
                }
                if (tc.subcategory) {
                    subcategoriesMap.set(tc.subcategory.id, tc.subcategory);
                }
            });
        });
        
        return {
            categories: Array.from(categoriesMap.values()),
            subcategories: Array.from(subcategoriesMap.values())
        };
    });

    // Initialize filters from URL params
    $effect(() => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            filters.type.value = params.get('type') || 'all';
            filters.dateRange.from = params.get('dateFrom') || '';
            filters.dateRange.to = params.get('dateTo') || '';
            filters.categories.selected = params.get('categories')?.split(',') || [];
            filters.subcategories.selected = params.get('subcategories')?.split(',') || [];
            filters.search.value = params.get('search') || '';
            filters.type.isNegative = params.get('excludeCategories')?.split(',').includes('income');
            filters.type.isNegative = params.get('excludeCategories')?.split(',').includes('expense') || filters.type.isNegative;
        }
    });

    function startEditing(transaction: any) {
        editingTransaction = transaction.id;
        editDescription = transaction.user_description || transaction.description;
    }

    async function saveDescription(transaction: any) {
        await transactions.updateTransactionDescription(transaction.id, editDescription);
        editingTransaction = null;
        
        // Invalidate the data to refresh from server
        await fetch('/transactions', {
            method: 'GET',
            headers: {
                'x-sveltekit-invalidate': 'supabase:transactions'
            }
        });
    }

    function focusOnElement(node: HTMLElement) {
        node.focus();
        return {};
    }

    function changePage(page: number) {
        goto(`?page=${page}`);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') editingTransaction = null;
    }

    function handleFilterChange() {
        // Clear any existing timeout
        if (debounceTimer) clearTimeout(debounceTimer);
        
        // Set a new timeout
        debounceTimer = setTimeout(() => {
            const filterForm = document.getElementById('filter-form') as HTMLFormElement;
            if (filterForm) {
                filterForm.requestSubmit();
            }
        }, 300);
    }

    function toggleCategory(categoryId: string) {
        const index = filters.categories.selected.indexOf(categoryId);
        if (index === -1) {
            filters.categories.selected = [...filters.categories.selected, categoryId];
        } else {
            filters.categories.selected = filters.categories.selected.filter(id => id !== categoryId);
        }
        // Clear subcategories that don't belong to selected categories
        if (filters.categories.selected.length > 0) {
            filters.subcategories.selected = filters.subcategories.selected.filter(subId => {
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
            filters.subcategories.selected = [...filters.subcategories.selected, subcategoryId];
        } else {
            filters.subcategories.selected = filters.subcategories.selected.filter(id => id !== subcategoryId);
        }
        handleFilterChange();
    }

    function clearFilters() {
        filters = {
            type: { value: 'all', isNegative: false },
            dateRange: { from: '', to: '', isNegative: false },
            categories: { selected: [], isNegative: false },
            subcategories: { selected: [], isNegative: false },
            search: { value: '', isNegative: false }
        };
        handleFilterChange();
    }
</script>

<div class="transactions-container">
    <form 
        id="filter-form"
        method="POST"
        use:enhance={() => {
            isLoading = true;
            
            return async ({ result }) => {
                isLoading = false;
                if (result.type === 'success') {
                    // Update the data but preserve the filter state
                    data = {
                        ...data,
                        transactions: result.data.transactions,
                        totalPages: result.data.totalPages,
                        currentPage: result.data.currentPage
                    };
                }
            };
        }}
    >
        <input type="hidden" name="filters" value={JSON.stringify(filters)} />
        <input type="hidden" name="page" value="1" />
        
        <div class="filters">
            <div class="filter-header">
                <h3>Filters</h3>
                <button type="button" class="clear-filters" onclick={clearFilters}>Clear All Filters</button>
            </div>

            <div class="filter-group">
                <div class="filter-row">
                    <label for="transaction-type">
                        Transaction Type:
                        <select id="transaction-type" bind:value={filters.type.value} onchange={handleFilterChange}>
                            <option value="all">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expenses</option>
                        </select>
                    </label>
                    <label class="negative-checkbox">
                        <input 
                            type="checkbox" 
                            bind:checked={filters.type.isNegative}
                            onchange={handleFilterChange}
                        />
                        Negative Filter
                    </label>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-row">
                    <div class="date-inputs">
                        <label for="date-from">
                            Date From:
                            <input 
                                id="date-from"
                                type="date" 
                                bind:value={filters.dateRange.from}
                                onchange={handleFilterChange}
                            />
                        </label>
                        <label for="date-to">
                            Date To:
                            <input 
                                id="date-to"
                                type="date" 
                                bind:value={filters.dateRange.to}
                                onchange={handleFilterChange}
                            />
                        </label>
                    </div>
                    <label class="negative-checkbox">
                        <input 
                            type="checkbox" 
                            bind:checked={filters.dateRange.isNegative}
                            onchange={handleFilterChange}
                        />
                        Negative Filter
                    </label>
                </div>
            </div>

            <div class="filter-group categories-filter">
                <div class="filter-row">
                    <div class="categories-section">
                        <span class="filter-label">Categories:</span>
                        <div class="categories-list">
                            {#each allCategories as category}
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox"
                                        checked={filters.categories.selected.includes(category.id.toString())}
                                        onchange={() => toggleCategory(category.id.toString())}
                                    />
                                    <span>{category.name}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                    <label class="negative-checkbox">
                        <input 
                            type="checkbox" 
                            bind:checked={filters.categories.isNegative}
                            onchange={handleFilterChange}
                        />
                        Negative Filter
                    </label>
                </div>

                {#if filters.categories.selected.length > 0}
                    <div class="filter-row">
                        <div class="subcategories-section">
                            <span class="filter-label">Subcategories:</span>
                            <div class="categories-list">
                                {#each allCategories.filter(cat => 
                                    filters.categories.selected.includes(cat.id.toString())
                                ) as category}
                                    {#each category.subcategories as subcategory}
                                        <label class="checkbox-label">
                                            <input 
                                                type="checkbox"
                                                checked={filters.subcategories.selected.includes(subcategory.id.toString())}
                                                onchange={() => toggleSubcategory(subcategory.id.toString())}
                                            />
                                            <span>{category.name} - {subcategory.name}</span>
                                        </label>
                                    {/each}
                                {/each}
                            </div>
                        </div>
                        <label class="negative-checkbox">
                            <input 
                                type="checkbox" 
                                bind:checked={filters.subcategories.isNegative}
                                onchange={handleFilterChange}
                            />
                            Negative Filter
                        </label>
                    </div>
                {/if}
            </div>

            <div class="filter-group">
                <div class="filter-row">
                    <label for="search">
                        Search:
                        <input 
                            id="search"
                            type="text" 
                            bind:value={filters.search.value}
                            oninput={handleFilterChange}
                            placeholder="Search in description..."
                        />
                    </label>
                    <label class="negative-checkbox">
                        <input 
                            type="checkbox" 
                            bind:checked={filters.search.isNegative}
                            onchange={handleFilterChange}
                        />
                        Negative Filter
                    </label>
                </div>
            </div>
        </div>
    </form>

    <div class="transactions">
        {#if isLoading}
            <div class="loading">Loading...</div>
        {:else}
            {#if transactionsList?.length}
                {#each transactionsList as transaction}
                    <div class="transaction-wrapper">
                        {#if editingTransaction === transaction.id}
                            <div class="transaction editing">
                                <div class="date">
                                    {new Date(transaction.operation_date).toLocaleDateString()}
                                </div>
                                <div class="description">
                                    <form 
                                        class="edit-form" 
                                        onsubmit={(e) => {
                                            e.preventDefault();
                                            saveDescription(transaction);
                                        }}
                                    >
                                        <input 
                                            type="text" 
                                            bind:value={editDescription}
                                            onkeydown={handleKeydown}
                                            use:focusOnElement
                                        />
                                        <button type="submit">Save</button>
                                        <button 
                                            type="button" 
                                            onclick={() => editingTransaction = null}
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                </div>
                                <div class="amount">
                                    {transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}
                                </div>
                                <div class="categories">
                                    {#each transaction.categories as tc}
                                        <div class="category">
                                            {tc.category.name}
                                            {#if tc.subcategory}
                                                - {tc.subcategory.name}
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <button 
                                class="transaction" 
                                onclick={() => startEditing(transaction)}
                                type="button"
                            >
                                <div class="date">
                                    {new Date(transaction.operation_date).toLocaleDateString()}
                                </div>
                                <div class="description">
                                    {transaction.user_description || transaction.description}
                                </div>
                                <div class="amount">
                                    {transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}
                                </div>
                                <div class="categories">
                                    {#each transaction.categories as tc}
                                        <div class="category">
                                            {tc.category.name}
                                            {#if tc.subcategory}
                                                - {tc.subcategory.name}
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </button>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="no-transactions">
                    No transactions found
                </div>
            {/if}
        {/if}
    </div>

    {#if totalPages > 1}
        <div class="pagination">
            <button 
                disabled={currentPage === 1}
                onclick={() => changePage(1)}
            >
                1
            </button>
            {#if currentPage > 3}
                <span>...</span>
            {/if}
            <button 
                disabled={currentPage === 1}
                onclick={() => changePage(currentPage - 1)}
            >
                Previous
            </button>
            <button 
                class:active={currentPage === currentPage}
                onclick={() => changePage(currentPage)}
            >
                {currentPage}
            </button>
            <button 
                disabled={currentPage === totalPages}
                onclick={() => changePage(currentPage + 1)}
            >
                Next
            </button>
            {#if currentPage < totalPages - 2}
                <span>...</span>
            {/if}
            <button 
                disabled={currentPage === totalPages}
                onclick={() => changePage(totalPages)}
            >
                {totalPages}
            </button>
        </div>
    {/if}
</div>

<style>
    .transactions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .transaction-wrapper {
        width: 100%;
    }

    .transaction {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        background-color: white;
        text-align: left;
        width: 100%;
    }

    .transaction:hover {
        background-color: #f5f5f5;
    }

    .transaction.editing {
        cursor: default;
    }

    .edit-form {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .edit-form input {
        padding: 0.25rem 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        flex-grow: 1;
    }

    .edit-form button {
        padding: 0.25rem 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
    }

    .edit-form button:hover {
        background-color: #f0f0f0;
    }

    .transactions-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .pagination {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination button.active {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
    }

    .pagination button:hover:not(:disabled) {
        background-color: #f0f0f0;
    }

    .pagination button.active:hover {
        background-color: #0056b3;
    }

    .filters {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 4px;
    }

    .filter-group {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .filter-group label {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .filter-group select,
    .filter-group input[type="text"],
    .filter-group input[type="date"] {
        padding: 0.25rem 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .filter-header h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    .clear-filters {
        padding: 0.5rem 1rem;
        border: 1px solid #dc3545;
        border-radius: 4px;
        background-color: white;
        color: #dc3545;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .clear-filters:hover {
        background-color: #dc3545;
        color: white;
    }

    .categories-filter {
        flex-direction: column;
        gap: 1.5rem;
    }

    .categories-section,
    .subcategories-section,
    .excluded-categories-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .categories-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem;
        background-color: white;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        font-size: 0.9rem;
    }

    .checkbox-label:hover {
        background-color: #e9ecef;
    }

    .filter-label {
        font-weight: 500;
        color: #495057;
    }

    .no-transactions {
        text-align: center;
        padding: 2rem;
        color: #666;
        font-style: italic;
    }

    .filter-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        width: 100%;
    }

    .date-inputs {
        display: flex;
        gap: 1rem;
    }

    .negative-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
        padding: 0.25rem 0.5rem;
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #666;
        font-style: italic;
    }
</style> 