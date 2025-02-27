<!-- Category distribution charts -->
<script lang="ts">
    import PieChart from './PieChart.svelte';

    type CategoryData = {
        id: string;
        name: string;
        amount: number;
    };

    type Props = {
        chartData: Array<{
            period: string;
            income: number;
            expenses: number;
            categories: Array<{
                id: string;
                name: string;
                amount: number;
                type: 'income' | 'expense';
            }>;
        }>;
    };

    const props = $props<Props>();
    const TOP_CATEGORIES_COUNT = 5;

    // Process data for pie charts
    function processDataForPieCharts(data: Props['chartData']) {
        const incomeByCategory = new Map<string, { id: string; name: string; amount: number }>();
        const expensesByCategory = new Map<string, { id: string; name: string; amount: number }>();

        // Process each data point's categories
        data.forEach(item => {
            item.categories.forEach(cat => {
                const categoryMap = cat.type === 'income' ? incomeByCategory : expensesByCategory;
                const existing = categoryMap.get(cat.id) || {
                    id: cat.id,
                    name: cat.name,
                    amount: 0
                };
                existing.amount += cat.amount;
                categoryMap.set(cat.id, existing);
            });
        });

        // Function to process categories with "Others"
        function processTopCategories(categories: CategoryData[]): CategoryData[] {
            // Sort by amount in descending order
            const sortedCategories = categories.sort((a, b) => b.amount - a.amount);
            
            if (sortedCategories.length <= TOP_CATEGORIES_COUNT) {
                return sortedCategories;
            }

            // Get top categories
            const topCategories = sortedCategories.slice(0, TOP_CATEGORIES_COUNT);
            
            // Sum up the rest into "Others"
            const othersAmount = sortedCategories
                .slice(TOP_CATEGORIES_COUNT)
                .reduce((sum, cat) => sum + cat.amount, 0);

            // Add "Others" category if there are remaining amounts
            if (othersAmount > 0) {
                topCategories.push({
                    id: 'others',
                    name: 'Others',
                    amount: othersAmount
                });
            }

            return topCategories;
        }

        return {
            income: processTopCategories(Array.from(incomeByCategory.values())),
            expenses: processTopCategories(Array.from(expensesByCategory.values()))
        };
    }

    $effect(() => {
        const { income, expenses } = processDataForPieCharts(props.chartData);
        incomePieData = income;
        expensesPieData = expenses;
    });

    let incomePieData = $state<CategoryData[]>([]);
    let expensesPieData = $state<CategoryData[]>([]);
</script>

<div class="category-charts">
    {#if incomePieData.length === 0 && expensesPieData.length === 0}
        <div class="flex flex-col items-center justify-center p-8 text-center bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
            <svg class="size-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">No category data available</h3>
            <p class="text-gray-500 mt-1">Try adjusting your filters or adding new transactions</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if incomePieData.length > 0}
                <PieChart 
                    data={incomePieData}
                    title="Income by Category"
                    type="income"
                />
            {/if}
            {#if expensesPieData.length > 0}
                <PieChart 
                    data={expensesPieData}
                    title="Expenses by Category"
                    type="expense"
                />
            {/if}
        </div>
    {/if}
</div>

<style>
    .category-charts {
        margin-bottom: 2rem;
    }
</style> 