import type { Database } from '$lib/db/types';

export type CategoryTotal = {
    category_id: number;
    category_name: string;
    total_amount: number;
    subcategories: Array<{
        id: number;
        name: string;
        amount: number;
        transactionCount: number;
    }>;
}

export type CategoryTotalsResponse = {
    success: boolean;
    data: CategoryTotal[];
    error?: string;
}

export type CategoryTotalsFunction = Database['public']['Functions']['get_category_totals'];
export type CategoryTotalsFunctionArgs = Parameters<CategoryTotalsFunction>[0];
export type CategoryTotalsFunctionResult = ReturnType<CategoryTotalsFunction>; 