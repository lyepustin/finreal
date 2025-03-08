export const ssr = false;

// This is just to make TypeScript happy, actual data loading happens client-side
export function load() {
    return {
        transactions: [],
        totalPages: 0,
        currentPage: 1,
        categories: [],
        filters: null
    };
} 