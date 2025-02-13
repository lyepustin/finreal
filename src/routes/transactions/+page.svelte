<script lang="ts">
    import type { PageData } from './$types'
    import { transactions } from '$lib/stores/transactions'
    import { enhance } from '$app/forms'
    import { goto } from '$app/navigation'

    let { data } = $props<{ data: PageData }>();

    const { transactionsList, totalPages, currentPage } = $derived({
        transactionsList: data.transactions,
        totalPages: data.totalPages,
        currentPage: data.currentPage
    });
    $inspect(transactionsList)
    let editingTransaction = $state<number | null>(null);
    let editDescription = $state('');

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
</script>

<div class="transactions-container">
    <div class="transactions">
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
</style> 