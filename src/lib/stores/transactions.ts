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
                return
            }

            update(transactions => 
                transactions.map(t => 
                    t.id === id 
                        ? { ...t, user_description } 
                        : t
                )
            )
        }
    }
}

export const transactions = createTransactionsStore() 