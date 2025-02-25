import { writable } from 'svelte/store'
import type { Transaction } from '$lib/types'
import * as TransactionModel from '$lib/models/transactions'

function createTransactionsStore() {
    const { subscribe, set, update } = writable<Transaction[]>([])

    return {
        subscribe,
        set,
        updateTransactionDescription: async (id: number, user_description: string) => {
            await TransactionModel.updateTransactionDescription(id, user_description)
            
            update(transactions => 
                transactions.map(t => 
                    t.id === id 
                        ? { ...t, user_description } 
                        : t
                )
            )
        },
        updateTransactionCategories: async (id: number, categories: { categoryId: number; subcategoryId: number | null; amount: number }[]) => {
            await TransactionModel.updateTransactionCategories(id, categories)
            // We don't update the store here since we'll be navigating away
            // and the list will be refreshed when we return
        }
    }
}

export const transactions = createTransactionsStore() 