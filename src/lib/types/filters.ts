export type TransactionFilterState = {
    type: {
        value: 'all' | 'income' | 'expense'
    };
    dateRange: {
        from: string;
        to: string;
    };
    categories: {
        selected: string[];
        isNegative: boolean;
    };
    subcategories: {
        selected: string[];
    };
    search: {
        value: string;
        isNegative: boolean;
    };
    sort: {
        column: 'date' | 'amount' | 'description' | null;
        direction: 'asc' | 'desc';
    };
    period?: {
        value: 'month' | 'week';
    };
    searchTerm: string;
    pageSize: number;
}

// Define AnalyticsFilterState to match TransactionFilterState structure
export interface AnalyticsFilterState {
    type: { value: 'all' | 'income' | 'expense' };
    dateRange: { 
        from: string; 
        to: string;
    };
    categories: {
        selected: string[];
        isNegative: boolean;
    };
    subcategories: {
        selected: string[];
    };
    search: {
        value: string;
        isNegative: boolean;
    };
    period: {
        value: 'month' | 'week';
    };
}

export const DEFAULT_FILTER_STATE: TransactionFilterState = {
    type: {
        value: 'all'
    },
    dateRange: {
        from: '',
        to: ''
    },
    categories: {
        selected: [],
        isNegative: false
    },
    subcategories: {
        selected: []
    },
    search: {
        value: '',
        isNegative: false
    },
    sort: {
        column: 'date',
        direction: 'desc'
    },
    searchTerm: '',
    pageSize: 30
}; 

export const DEFAULT_ANALYTICS_FILTER_STATE: AnalyticsFilterState = {
    type: { value: 'all' },
    dateRange: { 
        from: '', 
        to: ''
    },
    categories: {
        selected: [],
        isNegative: false
    },
    subcategories: {
        selected: []
    },
    search: {
        value: '',
        isNegative: false
    },
    period: {
        value: 'month'
    }
}; 

export interface DateRangeFilter {
    from: string;
    to: string;
}

export interface CategoryFilters {
    dateRange: DateRangeFilter;
}

// Import the utility function
import { getDefaultMonthDateRange } from '$lib/utils/dates';

export const DEFAULT_CATEGORY_FILTERS: CategoryFilters = {
    dateRange: getDefaultMonthDateRange()
}; 