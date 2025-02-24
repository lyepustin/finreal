<script lang="ts">
    import type { PageData } from './$types'
    import type { Category, SubCategory, Transaction } from '$lib/types'
    import { transactions } from '$lib/stores/transactions'
    import { enhance } from '$app/forms'
    import { goto, invalidate } from '$app/navigation'
    import { browser } from '$app/environment'

    let { data } = $props<{ data: PageData }>();

    let currentPage = $state(data.currentPage);
    
    const { transactionsList, totalPages, categories: allCategories, defaultFromDate } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages,
        categories: data.categories,
        defaultFromDate: data.defaultFromDate
    });

    $inspect(transactionsList)
    let editingTransaction = $state<number | null>(null);
    let editDescription = $state('');
    let isFiltersVisible = $state(false);

    // Filter state with proper typing
    interface FilterState {
        type: { value: 'all' | 'income' | 'expense' };
        dateRange: { 
            from: string; 
            to: string;
        };
        categories: {
            selected: string[];
            isNegative: boolean;
        };
        subcategories: {
            selected: string[];
        };
        search: {
            value: string;
            isNegative: boolean;
        };
        sort: {
            column: 'date' | 'amount' | 'description' | null;
            direction: 'asc' | 'desc';
        };
    }

    let filters = $state<FilterState>({
        type: { value: 'all' },
        dateRange: { 
            from: '', 
            to: ''
        },
        categories: {
            selected: [],
            isNegative: false
        },
        subcategories: {
            selected: []
        },
        search: {
            value: '',
            isNegative: false
        },
        sort: {
            column: 'date',
            direction: 'desc'
        }
    });

    // Effects
    $effect(() => {
        // Update the from date when defaultFromDate changes
        if (!filters.dateRange.from) {
            filters.dateRange.from = defaultFromDate || '';
        }
    });

    $effect(() => {
        if (filters.categories.isNegative) {
            filters.subcategories.selected = [];
        }
    });

    // Sync filters with URL parameters and handle redirections
    $effect(() => {
        if (browser) {
            // Update filters from URL params
            filters = data.filters;

            // Handle redirection to page 1 if needed
            if (data.shouldRedirectToPage1) {
                const params = new URLSearchParams(window.location.search);
                params.set('page', '1');
                goto(`${window.location.pathname}?${params.toString()}`, { replaceState: true });
            }
        }
    });

    // Update URL when filters change
    function updateURL() {
        if (!browser) return;
        
        const params = new URLSearchParams();
        
        // Only add parameters that are not default values
        if (filters.type.value !== 'all') {
            params.set('type', filters.type.value);
        }
        
        if (filters.dateRange.from && filters.dateRange.from !== defaultFromDate) {
            params.set('dateFrom', filters.dateRange.from);
        }
        
        if (filters.dateRange.to) {
            params.set('dateTo', filters.dateRange.to);
        }
        
        if (filters.categories.selected.length > 0) {
            params.set('categories', filters.categories.selected.join(','));
        }
        
        if (filters.categories.isNegative) {
            params.set('excludeCategories', 'true');
        }
        
        if (filters.subcategories.selected.length > 0) {
            params.set('subcategories', filters.subcategories.selected.join(','));
        }
        
        if (filters.search.value) {
            params.set('search', filters.search.value);
        }
        
        if (filters.search.isNegative) {
            params.set('excludeSearch', 'true');
        }
        
        if (filters.sort.column !== 'date' || filters.sort.direction !== 'desc') {
            params.set('sortColumn', filters.sort.column || 'date');
            params.set('sortDirection', filters.sort.direction);
        }

        if (currentPage > 1) {
            params.set('page', currentPage.toString());
        }

        // Update URL without reloading the page
        const newURL = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newURL);
    }

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

    // Transaction editing functions
    function startEditing(transaction: Transaction) {
        editingTransaction = transaction.id;
        editDescription = transaction.user_description || transaction.description;
    }

    async function saveDescription(transaction: Transaction) {
        await transactions.updateTransactionDescription(transaction.id, editDescription);
        editingTransaction = null;
        
        // Properly invalidate the data to refresh from server
        await invalidate('supabase:transactions');
    }

    function focusOnElement(node: HTMLElement) {
        node.focus();
        return {};
    }

    function handleFilterChange() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Reset to page 1 when filters change
            currentPage = 1;
            const filterForm = document.getElementById('filter-form') as HTMLFormElement;
            if (filterForm) {
                const pageInput = filterForm.querySelector('input[name="page"]') as HTMLInputElement;
                if (pageInput) {
                    pageInput.value = '1';
                }
                filterForm.requestSubmit();
            }
        }, 300);
    }

    function changePage(page: number) {
        // Validate page number
        if (page < 1 || page > totalPages) {
            return;
        }
        
        currentPage = page;
        const filterForm = document.getElementById('filter-form') as HTMLFormElement;
        if (filterForm) {
            const pageInput = filterForm.querySelector('input[name="page"]') as HTMLInputElement;
            if (pageInput) {
                pageInput.value = page.toString();
            }
            filterForm.requestSubmit();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') editingTransaction = null;
    }

    function toggleCategory(categoryId: string) {
        const index = filters.categories.selected.indexOf(categoryId);
        if (index === -1) {
            filters.categories.selected = [...filters.categories.selected, categoryId];
        } else {
            filters.categories.selected = filters.categories.selected.filter(id => id !== categoryId);
        }
        
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
            type: { value: 'all' },
            dateRange: { from: defaultFromDate || '', to: '' },
            categories: { selected: [], isNegative: false },
            subcategories: { selected: [] },
            search: { value: '', isNegative: false },
            sort: { column: 'date', direction: 'desc' }
        };
        currentPage = 1;
        handleFilterChange();
    }

    function handleSort(column: FilterState['sort']['column']) {
        if (filters.sort.column === column) {
            // Toggle direction if same column
            filters.sort.direction = filters.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Set new column with default desc direction
            filters.sort.column = column;
            filters.sort.direction = 'desc';
        }
        handleFilterChange();
    }

    function handleTransactionClick(transaction: Transaction) {
        // Preserve current URL parameters for the return URL
        const currentUrl = window.location.pathname + window.location.search;
        goto(`/transactions/${transaction.id}?returnUrl=${encodeURIComponent(currentUrl)}`);
    }

    // Update data effect
    $effect(() => {
        if (data.transactions) {
            currentPage = data.currentPage;
        }
    });

    // Custom form enhancement for GET requests
    function enhanceGetForm(node: HTMLFormElement) {
        async function handleSubmit(event: Event) {
            event.preventDefault();
            isLoading = true;

            try {
                // Get the form data
                const formData = new FormData(node);
                const searchParams = new URLSearchParams();
                
                // Convert FormData to URLSearchParams
                for (const [key, value] of formData) {
                    if (value) {
                        searchParams.append(key, value.toString());
                    }
                }

                // Validate page number against total pages
                const pageNum = parseInt(searchParams.get('page') || '1');
                if (pageNum > totalPages) {
                    searchParams.set('page', '1');
                    currentPage = 1;
                }

                // Update the URL
                const newURL = `${window.location.pathname}?${searchParams.toString()}`;
                await goto(newURL, { keepFocus: true });
            } catch (error) {
                console.error('Error submitting form:', error);
            } finally {
                isLoading = false;
            }
        }

        node.addEventListener('submit', handleSubmit);

        return {
            destroy() {
                node.removeEventListener('submit', handleSubmit);
            }
        };
    }
</script>

<div class="transactions-container">
    <button 
        class="toggle-filters-btn" 
        onclick={() => isFiltersVisible = !isFiltersVisible}
    >
        {isFiltersVisible ? 'Hide Filters' : 'Show Filters'}
    </button>

    <form 
        id="filter-form"
        method="GET"
        action="/transactions"
        class:hidden={!isFiltersVisible}
        use:enhanceGetForm
    >
        {#each Object.entries(filters) as [key, value]}
            {#if typeof value === 'object' && value !== null}
                {#each Object.entries(value) as [subKey, subValue]}
                    {#if Array.isArray(subValue)}
                        {#each subValue as item}
                            <input type="hidden" name={`${key}.${subKey}[]`} value={item} />
                        {/each}
                    {:else if typeof subValue === 'boolean'}
                        <input type="hidden" name={`${key}.${subKey}`} value={subValue ? 'true' : 'false'} />
                    {:else}
                        <input type="hidden" name={`${key}.${subKey}`} value={subValue?.toString() || ''} />
                    {/if}
                {/each}
            {/if}
        {/each}
        <input type="hidden" name="page" value={currentPage} />
        
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

                {#if filters.categories.selected.length > 0 && !filters.categories.isNegative}
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
            {#if currentPage > 1}
                <button 
                    onclick={() => changePage(currentPage - 1)}
                >
                    Previous
                </button>
            {/if}
            {#if currentPage > 1 && currentPage < totalPages}
                <button 
                    class="active"
                >
                    {currentPage}
                </button>
            {/if}
            {#if currentPage < totalPages}
                <button 
                    onclick={() => changePage(currentPage + 1)}
                >
                    Next
                </button>
            {/if}
            {#if currentPage < totalPages - 2}
                <span>...</span>
            {/if}
            {#if currentPage !== totalPages && totalPages > 1}
                <button 
                    onclick={() => changePage(totalPages)}
                >
                    {totalPages}
                </button>
            {/if}
        </div>
    {/if}   

    <div class="transactions">
        {#if isLoading}
            <div class="loading">Loading...</div>
        {:else}
            {#if transactionsList?.length}
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th>
                                <button 
                                    class="sort-button" 
                                    onclick={() => handleSort('date')}
                                    class:active={filters.sort.column === 'date'}
                                    title="Sort by date"
                                >
                                    Date
                                    {#if filters.sort.column === 'date'}
                                        <span class="sort-icon">{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
                                    {/if}
                                </button>
                            </th>
                            <th>
                                <button 
                                    class="sort-button"
                                    onclick={() => handleSort('description')}
                                    class:active={filters.sort.column === 'description'}
                                    title="Sort by description"
                                >
                                    Description
                                    {#if filters.sort.column === 'description'}
                                        <span class="sort-icon">{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
                                    {/if}
                                </button>
                            </th>
                            <th>
                                <button 
                                    class="sort-button"
                                    onclick={() => handleSort('amount')}
                                    class:active={filters.sort.column === 'amount'}
                                    title="Sort by amount"
                                >
                                    Amount
                                    {#if filters.sort.column === 'amount'}
                                        <span class="sort-icon">{filters.sort.direction === 'asc' ? '↑' : '↓'}</span>
                                    {/if}
                                </button>
                            </th>
                            <th>Categories</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each transactionsList as transaction}
                            <tr class="transaction-row">
                                {#if editingTransaction === transaction.id}
                                    <td>{new Date(transaction.operation_date).toLocaleDateString()}</td>
                                    <td>
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
                                    </td>
                                    <td>{transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}</td>
                                    <td class="categories-cell">
                                        {#each transaction.categories as tc}
                                            <div class="category">
                                                {tc.category.name}
                                                {#if tc.subcategory}
                                                    - {tc.subcategory.name}
                                                {/if}
                                            </div>
                                        {/each}
                                    </td>
                                {:else}
                                    <td>{new Date(transaction.operation_date).toLocaleDateString()}</td>
                                    <td>
                                        <button 
                                            class="description-button" 
                                            onclick={() => handleTransactionClick(transaction)}
                                            type="button"
                                        >
                                            {transaction.user_description || transaction.description}
                                        </button>
                                    </td>
                                    <td>{transaction.categories.reduce((sum, tc) => sum + tc.amount, 0).toFixed(2)}</td>
                                    <td class="categories-cell">
                                        {#each transaction.categories as tc}
                                            <div class="category">
                                                {tc.category.name}
                                                {#if tc.subcategory}
                                                    - {tc.subcategory.name}
                                                {/if}
                                            </div>
                                        {/each}
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <div class="no-transactions">
                    No transactions found
                </div>
            {/if}
        {/if}
    </div>

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
    .subcategories-section {
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

    .toggle-filters-btn {
        padding: 0.75rem 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        align-self: flex-start;
        margin-bottom: 1rem;
    }

    .toggle-filters-btn:hover {
        background-color: #0056b3;
    }

    .hidden {
        display: none;
    }

    .transactions-table {
        width: 100%;
        border-collapse: collapse;
        background-color: white;
        border-radius: 4px;
        overflow: hidden;
    }

    .transactions-table th {
        background-color: #f8f9fa;
        padding: 1rem;
        text-align: left;
        font-weight: 500;
        border-bottom: 2px solid #dee2e6;
    }

    .transactions-table td {
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
        vertical-align: top;
    }

    .transaction-row:hover {
        background-color: #f5f5f5;
    }

    .description-button {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        cursor: pointer;
        text-align: left;
        width: 100%;
    }

    .description-button:hover {
        color: #007bff;
    }

    .categories-cell {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .category {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        font-size: 0.9rem;
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

    .sort-button {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        font-weight: 500;
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        text-align: left;
    }

    .sort-button:hover {
        color: #007bff;
    }

    .sort-button.active {
        color: #007bff;
    }

    .sort-icon {
        font-size: 0.8em;
    }
</style> 