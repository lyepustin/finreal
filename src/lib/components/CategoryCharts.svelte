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
        <div class="no-data">No category data available</div>
    {:else}
        <div class="pie-charts-container">
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

    .pie-charts-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .no-data {
        text-align: center;
        padding: 2rem;
        color: #6c757d;
        font-size: 1.1rem;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    @media (max-width: 768px) {
        .pie-charts-container {
            grid-template-columns: 1fr;
        }
    }
</style> 