import { error } from '@sveltejs/kit';

export type CategoryRule = {
    id: number;
    category_id: number;
    pattern: string;
    category_name: string;
};

export async function getCategoryRules(): Promise<CategoryRule[]> {
    try {
        const response = await fetch('/api/categories/rules');

        if (!response.ok) {
            console.error('Error fetching category rules:', response.statusText);
            throw error(500, 'Failed to fetch category rules');
        }

        const { data } = await response.json();
        return data as CategoryRule[];
    } catch (err) {
        console.error('Error in getCategoryRules:', err);
        throw error(500, 'Internal server error');
    }
} 