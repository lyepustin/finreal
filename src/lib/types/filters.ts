export interface TransactionFilterState {
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
    sort: {
        column: 'date' | 'amount' | 'description' | null;
        direction: 'asc' | 'desc';
    };
    period?: {
        value: 'month' | 'week';
    };
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
    sort: {
        column: 'date',
        direction: 'desc'
    }
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

export const DEFAULT_CATEGORY_FILTERS: CategoryFilters = {
    dateRange: {
        from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0], // Last month
        to: new Date().toISOString().split('T')[0] // Today
    }
}; 