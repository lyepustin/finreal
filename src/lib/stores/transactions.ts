import { DataManager } from '$lib/utils/DataManager';
import type { Transaction } from '$lib/types';

interface TransactionsResponse {
    transactions: Transaction[];
    totalPages: number;
    currentPage: number;
}

class TransactionsManager extends DataManager<TransactionsResponse> {
    async updateTransactionDescription(id: number, user_description: string) {
        const response = await fetch(`/transactions/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ user_description })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            console.error('Error updating transaction:', error);
            return;
        }

        // Refresh the data after update
        await this.refresh();
    }
}

// Create a singleton instance
export const transactionsManager = new TransactionsManager(
    async (signal) => {
        const searchParams = new URLSearchParams(window.location.search);
        const page = searchParams.get('page') || '1';
        
        const response = await fetch(`/transactions?page=${page}`, { 
            signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON response but got ${contentType}`);
        }

        try {
            return await response.json();
        } catch (error) {
            console.error('Failed to parse transactions response:', error);
            throw new Error('Failed to parse server response as JSON');
        }
    }
); 