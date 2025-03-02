import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

type ChartDataPoint = {
    period: string;
    income: number;
    expenses: number;
    net: number;
};

type TransactionData = {
    operation_date: string;
    transaction_categories: Array<{
        amount: number;
    }>;
};

export const GET: RequestHandler = async ({ url }) => {
    try {
        const period = url.searchParams.get('period') || 'month';
        if (period !== 'month' && period !== 'year') {
            return json({ error: 'Invalid period. Must be month or year.' }, { status: 400 });
        }

        // Calculate date range based on period
        const now = new Date();
        const dateFrom = new Date(now);
        
        if (period === 'month') {
            dateFrom.setMonth(dateFrom.getMonth() - 5);
        } else {
            dateFrom.setFullYear(dateFrom.getFullYear() - 5);
        }
        dateFrom.setDate(1); // First day of the period
        
        const fromDateStr = dateFrom.toISOString().split('T')[0];
        const toDateStr = now.toISOString().split('T')[0];
        
        // Fetch transactions within date range with minimal required fields
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
                operation_date,
                transaction_categories (
                    amount
                )
            `)
            .gte('operation_date', fromDateStr)
            .lte('operation_date', toDateStr)
            .order('operation_date');
            
        if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError);
            return json({ error: 'Failed to fetch transactions' }, { status: 500 });
        }

        // If no transactions found, return empty data with proper structure
        if (!transactions || transactions.length === 0) {
            return json({
                chartData: ensureFivePeriods([], period)
            });
        }

        // Group and process transactions
        const chartData = processTransactions(transactions, period);
        
        return json({
            chartData: ensureFivePeriods(chartData, period)
        });

    } catch (error) {
        console.error('Error in financial data endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

function processTransactions(transactions: TransactionData[], period: string): ChartDataPoint[] {
    const groupedData = new Map<string, { income: number; expenses: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    transactions.forEach(transaction => {
        const date = new Date(transaction.operation_date);
        const key = period === 'month' 
            ? `${monthNames[date.getMonth()]} ${date.getFullYear()}`
            : date.getFullYear().toString();

        if (!groupedData.has(key)) {
            groupedData.set(key, { income: 0, expenses: 0 });
        }

        const periodData = groupedData.get(key)!;
        transaction.transaction_categories.forEach(tc => {
            const amount = tc.amount || 0;
            if (amount > 0) {
                periodData.income += amount;
            } else {
                periodData.expenses += Math.abs(amount);
            }
        });
    });

    return Array.from(groupedData.entries())
        .map(([period, data]) => ({
            period,
            income: Math.round(data.income * 100) / 100,
            expenses: Math.round(data.expenses * 100) / 100,
            net: Math.round((data.income - data.expenses) * 100) / 100
        }))
        .sort((a, b) => {
            if (period === 'month') {
                const [monthA, yearA] = a.period.split(' ');
                const [monthB, yearB] = b.period.split(' ');
                return yearA === yearB 
                    ? monthNames.indexOf(monthA) - monthNames.indexOf(monthB)
                    : parseInt(yearA) - parseInt(yearB);
            }
            return parseInt(a.period) - parseInt(b.period);
        });
}

function ensureFivePeriods(chartData: ChartDataPoint[], period: string): ChartDataPoint[] {
    if (chartData.length > 5) {
        return chartData.slice(-5);
    }

    if (chartData.length < 5) {
        const emptyPeriods = [];
        const now = new Date();
        const existingPeriods = new Set(chartData.map(item => item.period));
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 4; i >= 0; i--) {
            const date = new Date(now);
            if (period === 'month') {
                date.setMonth(date.getMonth() - i);
                const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                if (!existingPeriods.has(key)) {
                    emptyPeriods.push({
                        period: key,
                        income: 0,
                        expenses: 0,
                        net: 0
                    });
                }
            } else {
                date.setFullYear(date.getFullYear() - i);
                const key = date.getFullYear().toString();
                if (!existingPeriods.has(key)) {
                    emptyPeriods.push({
                        period: key,
                        income: 0,
                        expenses: 0,
                        net: 0
                    });
                }
            }
        }

        return [...emptyPeriods, ...chartData].slice(-5);
    }

    return chartData;
} 