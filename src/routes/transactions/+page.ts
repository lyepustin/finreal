import { redirect } from '@sveltejs/kit';

export const ssr = false;

export const load = async ({ parent }) => {
    const { session } = await parent();
    
    if (!session) {
        throw redirect(303, '/auth');
    }

    // Initial data state
    return {
        session,
        transactions: [],
        totalPages: 0,
        currentPage: 1,
        categories: [],
        filters: null
    };
} 