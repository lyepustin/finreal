<script lang="ts">
    import type { PageData } from './$types';
    import type { Category, SubCategory, Transaction } from '$lib/types';
    import { transactions } from '$lib/stores/transactions';
    import { goto } from '$app/navigation';

    let { data } = $props<{ data: PageData }>();

    // Initialize state from props
    let transaction = $state(data.transaction);
    let categories = $state(data.categories);
    
    $inspect(categories, 'Initial categories');
    $inspect(transaction, 'Initial transaction');

    // Store the initial transaction amount as a fixed value
    let transactionAmount = $state(0);

    // Initialize transaction amount once when component loads
    $effect(() => {
        // Only run this effect once when the transaction is first loaded
        if (transaction?.categories?.length && transactionAmount === 0) {
            const total = transaction.categories.reduce((sum, tc) => sum + (Number(tc.amount) || 0), 0);
            transactionAmount = Number(total.toFixed(2));
            $inspect(transactionAmount, 'Initial transaction amount set');
        }
    });

    // Initialize description and categories only if transaction exists
    let selectedDescription = $state('');
    let selectedCategories = $state([]);
    let selectedCategoryId = $state<number | null>(null);

    $effect(() => {
        if (transaction) {
            $inspect(transaction, 'Transaction in initialization effect');
            selectedDescription = transaction.user_description || transaction.description || '';
            
            // Initialize categories with proper amounts
            if (transaction.categories?.length) {
                selectedCategories = transaction.categories.map(tc => ({
                    categoryId: tc.category.id,
                    subcategoryId: tc.subcategory?.id || categories.find(c => c.id === tc.category.id)?.subcategories?.[0]?.id || null,
                    amount: Number(tc.amount) || 0
                }));
                $inspect(selectedCategories, 'Initialized categories from transaction');
            } else {
                // If no categories, create one with the full amount
                selectedCategories = [{
                    categoryId: categories?.[0]?.id || 0,
                    subcategoryId: categories?.[0]?.subcategories?.[0]?.id || null,
                    amount: transactionAmount
                }];
                $inspect(selectedCategories, 'Initialized with single category');
            }
        }
    });

    // Create a derived value for each category's subcategories
    function getCategorySubcategories(categoryId: number) {
        let result = $derived(() => {
            const category = categories?.find(c => c.id === categoryId);
            return category?.subcategories || [];
        });
        return result;
    }

    let isLoading = $state(false);
    let errorMessage = $state<string | null>(null);

    // Track changes in selected categories for debugging
    $effect(() => {
        $inspect(selectedCategories, 'Selected categories changed');
        $inspect(transactionAmount, 'Current transaction amount');
    });

    // Function to distribute amount evenly among categories
    function distributeAmount() {
        if (!selectedCategories?.length) return;
        
        // Calculate per-category amount, handling negative values
        let amountPerCategory = Number((transactionAmount / selectedCategories.length).toFixed(2));
        if (isNaN(amountPerCategory)) amountPerCategory = 0;
        
        // Calculate remainder considering negative values
        const totalDistributed = amountPerCategory * (selectedCategories.length - 1);
        let firstCategoryAmount = Number((transactionAmount - totalDistributed).toFixed(2));
        if (isNaN(firstCategoryAmount)) firstCategoryAmount = 0;
        
        // Update all categories with their new amounts
        selectedCategories = selectedCategories.map((cat, index) => ({
            ...cat,
            amount: index === 0 ? firstCategoryAmount : amountPerCategory
        }));
    }

    async function handleSubmit() {
        if (!transaction) return;
        
        try {
            isLoading = true;
            errorMessage = null;

            // Update description if it has changed from the current user_description
            if (selectedDescription !== (transaction.user_description || transaction.description)) {
                await transactions.updateTransactionDescription(transaction.id, selectedDescription);
            }

            // Update categories
            await transactions.updateTransactionCategories(transaction.id, selectedCategories);

            // Go back to the transactions list, preserving the search params
            const searchParams = new URLSearchParams(window.location.search);
            const returnUrl = searchParams.get('returnUrl') || '/transactions';
            await goto(returnUrl);
        } catch (error) {
            console.error('Failed to update transaction:', error);
            errorMessage = 'Failed to update transaction. Please try again.';
        } finally {
            isLoading = false;
        }
    }

    function handleCancel() {
        const searchParams = new URLSearchParams(window.location.search);
        const returnUrl = searchParams.get('returnUrl') || '/transactions';
        goto(returnUrl);
    }

    function updateCategoryAmount(index: number, amount: number) {
        const validAmount = Number(amount);
        if (!isNaN(validAmount)) {
            selectedCategories[index].amount = validAmount;
            selectedCategories = [...selectedCategories]; // Trigger reactivity
        }
    }

    function updateCategory(index: number, categoryId: number) {
        // Ensure categoryId is a number
        const numericCategoryId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
        selectedCategories[index].categoryId = numericCategoryId;
        
        // Get the first subcategory if available
        const category = categories?.find(c => c.id === numericCategoryId);
        const firstSubcategory = category?.subcategories?.[0];
        selectedCategories[index].subcategoryId = firstSubcategory?.id || null;
        
        selectedCategories = [...selectedCategories]; // Trigger reactivity
        selectedCategoryId = numericCategoryId; // Track the selected category for logging
    }

    // Effect for logging category changes
    $effect(() => {
        if (selectedCategoryId !== null) {
            $inspect(selectedCategoryId, 'Selected category ID changed to');
            const category = categories?.find(c => c.id === selectedCategoryId);
            $inspect(category, 'Selected category');
            $inspect(category?.subcategories, 'Available subcategories');
        }
    });

    function updateSubcategory(index: number, subcategoryId: number) {
        // Ensure subcategoryId is a number
        const numericSubcategoryId = typeof subcategoryId === 'string' ? parseInt(subcategoryId) : subcategoryId;
        selectedCategories[index].subcategoryId = numericSubcategoryId;
        selectedCategories = [...selectedCategories]; // Trigger reactivity
    }

    function addCategory() {
        if (!categories?.length) return;
        
        const firstCategory = categories[0];
        const firstSubcategory = firstCategory.subcategories?.[0];
        
        // Add new category with explicit 0 amount
        selectedCategories = [
            ...selectedCategories,
            {
                categoryId: firstCategory.id,
                subcategoryId: firstSubcategory?.id || null,
                amount: 0
            }
        ];

        // Distribute amounts evenly
        distributeAmount();
    }

    function removeCategory(index: number) {
        selectedCategories = selectedCategories.filter((_, i) => i !== index);
        
        // Redistribute amounts after removing a category
        if (selectedCategories.length > 0) {
            distributeAmount();
        }
    }
</script>

{#if !transaction || !categories}
    <div class="loading">Loading transaction data...</div>
{:else if errorMessage}
    <div class="error-message">
        {errorMessage}
        <button class="secondary" onclick={handleCancel}>Go Back</button>
    </div>
{:else}
    <div class="edit-transaction">
        <div class="header">
            <h2>Edit Transaction</h2>
            <div class="actions">
                <button class="secondary" onclick={handleCancel}>Back</button>
                <button 
                    class="primary" 
                    onclick={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>

        <div class="form">
            <div class="form-group">
                <label for="description">Description</label>
                <input
                    id="description"
                    type="text"
                    bind:value={selectedDescription}
                    placeholder="Enter transaction description"
                    disabled={isLoading}
                />
            </div>

            <div class="categories-section">
                <div class="categories-header">
                    <h3>Categories</h3>
                    <button 
                        class="secondary small" 
                        onclick={addCategory}
                        disabled={isLoading}
                    >
                        Add Category
                    </button>
                </div>

                {#each selectedCategories as category, index}
                    <div class="category-row">
                        <div class="category-selects">
                            <select
                                bind:value={category.categoryId}
                                onchange={() => updateCategory(index, category.categoryId)}
                                disabled={isLoading}
                            >
                                {#each categories as cat}
                                    <option value={cat.id}>{cat.name}</option>
                                {/each}
                            </select>

                            {#if categories?.find(c => c.id === category.categoryId)?.subcategories?.length}
                                <select
                                    bind:value={category.subcategoryId}
                                    onchange={() => updateSubcategory(index, category.subcategoryId)}
                                    disabled={isLoading}
                                >
                                    {#each categories.find(c => c.id === category.categoryId).subcategories as subcat}
                                        <option value={subcat.id}>{subcat.name}</option>
                                    {/each}
                                </select>
                            {/if}

                            <input
                                type="number"
                                step="0.01"
                                bind:value={category.amount}
                                onchange={() => updateCategoryAmount(index, category.amount)}
                                disabled={isLoading}
                            />
                        </div>

                        <button 
                            class="danger small"
                            onclick={() => removeCategory(index)}
                            disabled={selectedCategories.length === 1 || isLoading}
                        >
                            Remove
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .edit-transaction {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        font-size: 1.2rem;
        color: #666;
    }

    .error-message {
        padding: 1rem;
        margin-bottom: 1rem;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        color: #721c24;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .header h2 {
        margin: 0;
    }

    .actions {
        display: flex;
        gap: 1rem;
    }

    .form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        font-weight: 500;
    }

    .form-group input {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }

    .categories-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .categories-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .categories-header h3 {
        margin: 0;
    }

    .category-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 4px;
    }

    .category-selects {
        display: flex;
        gap: 1rem;
        flex-grow: 1;
    }

    .category-selects select,
    .category-selects input {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }

    .category-selects select {
        flex-grow: 1;
    }

    .category-selects input {
        width: 120px;
    }

    button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        border: none;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button.primary {
        background-color: #007bff;
        color: white;
    }

    button.primary:hover:not(:disabled) {
        background-color: #0056b3;
    }

    button.secondary {
        background-color: #6c757d;
        color: white;
    }

    button.secondary:hover:not(:disabled) {
        background-color: #5a6268;
    }

    button.danger {
        background-color: #dc3545;
        color: white;
    }

    button.danger:hover:not(:disabled) {
        background-color: #c82333;
    }

    button.small {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
    }
</style> 