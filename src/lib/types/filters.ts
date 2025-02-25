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