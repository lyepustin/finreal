import { writable } from 'svelte/store'
import type { Transaction } from '$lib/types'

function createTransactionsStore() {
    const { subscribe, set, update } = writable<Transaction[]>([])

    return {
        subscribe,
        set,
        updateTransactionDescription: async (id: number, user_description: string) => {
            const response = await fetch(`/transactions/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_description })
            })

            if (!response.ok) {
                const error = await response.json()
                console.error('Error updating transaction:', error)
                throw new Error('Failed to update transaction description')
            }

            update(transactions => 
                transactions.map(t => 
                    t.id === id 
                        ? { ...t, user_description } 
                        : t
                )
            )
        },
        updateTransactionCategories: async (id: number, categories: { categoryId: number; subcategoryId: number | null; amount: number }[]) => {
            const response = await fetch(`/transactions/${id}/categories`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ categories })
            })

            if (!response.ok) {
                const error = await response.json()
                console.error('Error updating transaction categories:', error)
                throw new Error('Failed to update transaction categories')
            }

            // We don't update the store here since we'll be navigating away
            // and the list will be refreshed when we return
        }
    }
}

export const transactions = createTransactionsStore() 