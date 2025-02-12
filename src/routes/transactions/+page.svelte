<script lang="ts">
    import type { PageData } from './$types'
    import { transactions } from '$lib/stores/transactions'
    import { enhance } from '$app/forms'

    export let data: PageData

    $: ({ transactions: transactionsList } = data)

    let editingTransaction: number | null = null
    let editDescription = ''

    function startEditing(transaction: any) {
        editingTransaction = transaction.id
        editDescription = transaction.user_description || transaction.description
    }

    async function saveDescription(transaction: any) {
        await transactions.updateTransactionDescription(transaction.id, editDescription)
        editingTransaction = null
        
        // Invalidate the data to refresh from server
        await fetch('/transactions', {
            method: 'GET',
            headers: {
                'x-sveltekit-invalidate': 'supabase:transactions'
            }
        })
    }

    function focusOnElement(node: HTMLElement) {
        node.focus()
        return {}
    }
</script>

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
                            on:submit|preventDefault={() => saveDescription(transaction)}
                        >
                            <input 
                                type="text" 
                                bind:value={editDescription}
                                on:keydown={(e) => {
                                    if (e.key === 'Escape') editingTransaction = null
                                }}
                                use:focusOnElement
                            />
                            <button type="submit">Save</button>
                            <button type="button" on:click={() => editingTransaction = null}>
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
                    on:click={() => startEditing(transaction)}
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
</style> 