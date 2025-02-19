<!-- Analytics page with bar chart -->
<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    import {
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    } from 'chart.js';

    // Register Chart.js components
    Chart.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    );

    let { data } = $props<{ data: PageData }>();
    let chartData = $state(data.chartData);
    let categories = $state(data.categories);
    let defaultFromDate = $state(data.defaultFromDate);
    let defaultToDate = $state(data.defaultToDate);
    let chartInstance: Chart | null = $state(null);
    let chartCanvas = $state<HTMLCanvasElement | null>(null);
    let isLoading = $state(false);
    let chartContainer: HTMLDivElement;

    console.log('Initial chartData:', chartData);

    // Format date for x-axis
    function formatPeriod(period: string, type: 'month' | 'week' = 'month') {
        if (type === 'month') {
            const [year, month] = period.split('-');
            return `${month}/${year}`;
        } else {
            const [year, week] = period.split('-W');
            return `W${week}/${year}`;
        }
    }

    // Transform data for Chart.js
    const transformedChartData = $derived(() => {
        console.log('Transforming chart data:', chartData);
        if (!Array.isArray(chartData) || chartData.length === 0) {
            console.log('No valid chart data available');
            return null;
        }

        const labels = chartData.map(d => formatPeriod(d.period, filters.period.value));
        const incomeData = chartData.map(d => d.income);
        const expensesData = chartData.map(d => d.expenses);

        console.log('Transformed data:', { labels, incomeData, expensesData });
        return { labels, incomeData, expensesData };
    });

    // Update or create chart
    function updateChart() {
        console.log('Updating chart...');
        console.log('Canvas:', chartCanvas);
        console.log('Transformed data:', transformedChartData);

        if (!transformedChartData || !chartCanvas) {
            console.log('Missing required data for chart update');
            return;
        }

        // Set canvas dimensions based on container
        if (chartContainer) {
            const { width, height } = chartContainer.getBoundingClientRect();
            chartCanvas.width = width;
            chartCanvas.height = height;
        }

        // Destroy existing chart if it exists
        if (chartInstance) {
            console.log('Destroying existing chart');
            chartInstance.destroy();
            chartInstance = null;
        }

        const config = {
            type: 'bar' as const,
            data: {
                labels: transformedChartData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: transformedChartData.incomeData,
                        backgroundColor: '#a8e6cf80', // Pastel green with transparency
                        borderColor: '#a8e6cf',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: transformedChartData.expensesData,
                        backgroundColor: '#ffb3ba80', // Pastel red with transparency
                        borderColor: '#ffb3ba',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top' as const,
                    },
                    title: {
                        display: true,
                        text: 'Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        ticks: {
                            callback: (value) => `$${value.toLocaleString()}`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: filters.period.value === 'month' ? 'Months' : 'Weeks'
                        }
                    }
                }
            }
        };

        console.log('Creating new chart with config:', config);
        chartInstance = new Chart(chartCanvas, config);
    }

    // Handle window resize
    let resizeTimeout: ReturnType<typeof setTimeout>;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (chartInstance) {
                chartInstance.resize();
            }
        }, 100);
    }

    onMount(() => {
        console.log('Component mounted');
        window.addEventListener('resize', handleResize);
        if (transformedChartData && chartCanvas) {
            updateChart();
        }
        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartInstance) {
                console.log('Cleaning up chart');
                chartInstance.destroy();
                chartInstance = null;
            }
        };
    });

    // Filter state
    let filters = $state({
        type: { value: 'all' },
        dateRange: { 
            from: defaultFromDate,
            to: defaultToDate
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
            value: 'month' as const
        }
    });

    // Debounced filter handler
    let debounceTimer: ReturnType<typeof setTimeout>;
    function handleFilterChange() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            document.getElementById('filter-form')?.requestSubmit();
        }, 300);
    }

    // Form submission handler
    function handleFormSubmit() {
        isLoading = true;
        
        return async ({ result }: { result: any }) => {
            console.log('Form submission result:', result);
            isLoading = false;
            
            if (result.type === 'success' && result.data?.data?.chartData) {
                chartData = result.data.data.chartData;
                console.log('Updated chartData:', chartData);
            }
        };
    }
</script>

<div class="analytics-container">
    <form 
        id="filter-form"
        method="POST"
        use:enhance={handleFormSubmit}
    >
        <input type="hidden" name="filters" value={JSON.stringify(filters)} />
        
        <div class="filters">
            <div class="filter-header">
                <h3>Filters</h3>
                <div class="period-selector">
                    <label>
                        Period:
                        <select bind:value={filters.period.value} onchange={handleFilterChange}>
                            <option value="month">Monthly</option>
                            <option value="week">Weekly</option>
                        </select>
                    </label>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-row">
                    <label>
                        Transaction Type:
                        <select bind:value={filters.type.value} onchange={handleFilterChange}>
                            <option value="all">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expenses</option>
                        </select>
                    </label>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-row date-inputs">
                    <label>
                        From:
                        <input 
                            type="date" 
                            bind:value={filters.dateRange.from}
                            onchange={handleFilterChange}
                        />
                    </label>
                    <label>
                        To:
                        <input 
                            type="date" 
                            bind:value={filters.dateRange.to}
                            onchange={handleFilterChange}
                        />
                    </label>
                </div>
            </div>

            <div class="filter-group">
                <div class="categories-section">
                    <span class="section-title">Categories</span>
                    <div class="categories-list">
                        {#each categories as category}
                            <label class="category-item">
                                <input 
                                    type="checkbox"
                                    checked={filters.categories.selected.includes(category.id.toString())}
                                    onchange={() => {
                                        const id = category.id.toString();
                                        if (filters.categories.selected.includes(id)) {
                                            filters.categories.selected = filters.categories.selected.filter(c => c !== id);
                                        } else {
                                            filters.categories.selected = [...filters.categories.selected, id];
                                        }
                                        handleFilterChange();
                                    }}
                                />
                                <span>{category.name}</span>
                            </label>
                        {/each}
                    </div>
                    <label class="negative-filter">
                        <input 
                            type="checkbox" 
                            bind:checked={filters.categories.isNegative}
                            onchange={handleFilterChange}
                        />
                        Exclude selected categories
                    </label>
                </div>
            </div>
        </div>
    </form>

    <div 
        class="chart-container" 
        bind:this={chartContainer}
    >
        {#if isLoading}
            <div class="loading">Loading chart data...</div>
        {:else if transformedChartData}
            <canvas 
                bind:this={chartCanvas}
            ></canvas>
        {:else}
            <div class="no-data">No data available for the selected filters</div>
        {/if}
    </div>
</div>

<style>
    .analytics-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    .filters {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .filter-header h3 {
        margin: 0;
        color: #2c3e50;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .filter-row {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .date-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    select,
    input[type="date"] {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        font-size: 0.9rem;
    }

    .categories-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .section-title {
        font-weight: 600;
        color: #2c3e50;
    }

    .categories-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
        padding: 1rem;
        background-color: white;
        border-radius: 4px;
        border: 1px solid #ddd;
    }

    .category-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .category-item:hover {
        background-color: #e9ecef;
    }

    .negative-filter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .chart-container {
        position: relative;
        height: 400px;
        background-color: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .chart-container canvas {
        width: 100% !important;
        height: 100% !important;
    }

    .loading,
    .no-data {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #6c757d;
        font-size: 1.1rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        color: #495057;
        font-size: 0.9rem;
    }

    .period-selector select {
        min-width: 120px;
    }
</style> 