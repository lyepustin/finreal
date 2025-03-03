<script lang="ts">
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
    import CategoryPieChart from './CategoryPieChart.svelte';

    // Register Chart.js components
    Chart.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    );

    type ChartDataPoint = {
        period: string;
        income: number;
        expenses: number;
        net: number;
        categories: Array<{
            id: string;
            name: string;
            amount: number;
            emoji: string;
        }>;
    };

    // State variables
    let chartInstance: Chart | null = null;
    let chartContainer = $state<HTMLDivElement | undefined>(undefined);
    let canvas = $state<HTMLCanvasElement | undefined>(undefined);
    let selectedPeriod = $state('month');
    let selectedBarIndex = $state(5);
    let currentOffset = $state(0); // Track how many periods we've moved back
    let selectedBarData = $state<ChartDataPoint>({
        income: 0,
        expenses: 0,
        net: 0,
        period: '',
        categories: []
    });
    let isDropdownOpen = $state(false);
    let isLoading = $state(true);
    let chartData = $state<ChartDataPoint[]>([]);
    let error = $state('');
    let dateRange = $state({
        from: '',
        to: ''
    });

    // Process category data for pie chart
    function processCategories(categories: ChartDataPoint['categories']) {
        // Filter to only show expense categories (negative amounts)
        const expenseCategories = categories.filter(cat => cat.amount < 0);
        
        // Calculate total expenses
        const totalExpenses = expenseCategories.reduce((sum, cat) => sum + Math.abs(cat.amount), 0);
        
        // Sort categories by absolute amount
        const sortedCategories = [...expenseCategories].sort((a, b) => 
            Math.abs(b.amount) - Math.abs(a.amount)
        );

        // Separate categories into main and others (less than 5% of total)
        const MINIMUM_PERCENTAGE = 0.05; // 5% threshold
        const mainCategories: typeof sortedCategories = [];
        const smallCategories: typeof sortedCategories = [];

        sortedCategories.forEach(category => {
            const percentage = Math.abs(category.amount) / totalExpenses;
            if (percentage >= MINIMUM_PERCENTAGE && mainCategories.length < 5) {
                mainCategories.push(category);
            } else {
                smallCategories.push(category);
            }
        });

        // If we have small categories, combine them into "Others"
        if (smallCategories.length > 0) {
            const othersAmount = smallCategories.reduce((sum, cat) => sum + cat.amount, 0);
            mainCategories.push({
                id: 'others',
                name: 'Others',
                amount: othersAmount,
                emoji: '🌈'
            });
        }

        return mainCategories;
    }

    // Fetch data from API
    async function fetchData() {
        isLoading = true;
        error = '';
        
        try {
            // Add count and offset parameters to get correct period of data
            const response = await fetch(`/api/financial-data?period=${selectedPeriod}&count=5&offset=${currentOffset}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update state with fetched data
            chartData = data.chartData || [];
            
            // Ensure we have exactly 5 data points for months
            if (selectedPeriod === 'month' && chartData.length < 5) {
                const lastDate = chartData.length > 0 ? new Date(chartData[chartData.length - 1].period) : new Date();
                while (chartData.length < 5) {
                    lastDate.setMonth(lastDate.getMonth() - 1);
                    chartData.unshift({
                        period: lastDate.toISOString().split('T')[0],
                        income: 0,
                        expenses: 0,
                        net: 0,
                        categories: []
                    });
                }
            }
            
            console.log('Fetched chart data:', chartData);
            
            // Find the rightmost non-empty bar
            selectedBarIndex = findLastNonEmptyBarIndex(chartData);
            selectedBarData = chartData[selectedBarIndex];
            
            // Update chart
            setTimeout(() => {
                updateChart();
            }, 0);
        } catch (err) {
            console.error('Error fetching financial data:', err);
            error = err.message || 'Failed to load financial data';
        } finally {
            isLoading = false;
        }
    }

    function findLastNonEmptyBarIndex(data: ChartDataPoint[]): number {
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].income > 0 || data[i].expenses > 0) {
                return i;
            }
        }
        return data.length - 1;
    }

    // Format x-axis label based on period
    function formatXAxisLabel(period: string, date: string): string {
        const currentDate = new Date(date);
        
        switch (selectedPeriod) {
            case 'month':
                return `${getMonthName(currentDate.getMonth())}`;
            case 'year':
                return currentDate.getFullYear().toString();
            default:
                return date;
        }
    }

    // Update chart when period changes
    function updateChart() {
        console.log('Updating chart with data:', chartData);
        console.log('Chart container:', chartContainer);
        console.log('Canvas:', canvas);
        
        if (!canvas || chartData.length === 0) {
            console.error('Cannot update chart: canvas or chartData is missing');
            return;
        }

        if (chartContainer) {
            const { width, height } = chartContainer.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        }

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        
        // Ensure we only show the last 5 data points
        const displayData = chartData.slice(-5);
        selectedBarIndex = Math.min(selectedBarIndex, displayData.length - 1);
        selectedBarData = displayData[selectedBarIndex];

        const config = {
            type: 'bar' as const,
            data: {
                labels: displayData.map(d => formatXAxisLabel(selectedPeriod, d.period)),
                datasets: [
                    {
                        label: 'Income',
                        data: displayData.map(d => Math.round(d.income)),
                        backgroundColor: displayData.map((_, i) => 
                            i === selectedBarIndex ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.6)'
                        ),
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: (context) => context.dataIndex === selectedBarIndex ? 2 : 1,
                    },
                    {
                        label: 'Expenses',
                        data: displayData.map(d => Math.round(d.expenses)),
                        backgroundColor: displayData.map((_, i) => 
                            i === selectedBarIndex ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.6)'
                        ),
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: (context) => context.dataIndex === selectedBarIndex ? 2 : 1,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    y: { 
                        display: false, 
                        grid: { display: false },
                        ticks: {
                            callback: function(value) {
                                return formatEuro(value as number);
                            }
                        }
                    },
                    x: { 
                        display: true, 
                        grid: { display: false },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 11
                            },
                            color: '#6B7280'
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const newIndex = elements[0].index;
                        if (newIndex !== selectedBarIndex) {
                            selectedBarIndex = newIndex;
                            selectedBarData = displayData[selectedBarIndex];
                            
                            // Update chart colors without recreating the chart
                            chartInstance.data.datasets.forEach((dataset, i) => {
                                dataset.backgroundColor = displayData.map((_, idx) => 
                                    idx === selectedBarIndex 
                                        ? i === 0 
                                            ? 'rgba(59, 130, 246, 0.9)' 
                                            : 'rgba(239, 68, 68, 0.9)'
                                        : i === 0
                                            ? 'rgba(59, 130, 246, 0.6)'
                                            : 'rgba(239, 68, 68, 0.6)'
                                );
                                dataset.borderWidth = displayData.map((_, idx) => 
                                    idx === selectedBarIndex ? 2 : 1
                                );
                            });
                            chartInstance.update('none'); // Update without animation
                        }
                    }
                }
            }
        };

        chartInstance = new Chart(canvas, config);
    }

    // Handle period change
    function handlePeriodChange(period: string) {
        selectedPeriod = period;
        currentOffset = 0; // Reset offset when changing period type
        isDropdownOpen = false; // Close dropdown after selection
        fetchData(); // Fetch new data for the selected period
    }

    // Toggle dropdown
    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event) {
        const dropdown = document.getElementById('dropdown');
        const button = document.getElementById('dropdownDefaultButton');
        
        if (isDropdownOpen && dropdown && button && 
            !dropdown.contains(event.target) && 
            !button.contains(event.target)) {
            isDropdownOpen = false;
        }
    }

    // Handle window resize
    let resizeTimeout;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (chartInstance) {
                chartInstance.resize();
            }
        }, 100);
    }

    // Format currency
    function formatEuro(value: number): string {
        const roundedValue = Math.round(value);
        const formattedValue = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${formattedValue}€`;
    }

    // Get date range text based on period
    function getDateRangeText() {
        // Parse the selected period
        const periodParts = selectedBarData.period.split(' ');
        const monthName = periodParts[0];
        const year = parseInt(periodParts[1]);
        
        // Get month index for the selected month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthName);
        
        switch (selectedPeriod) {
            case 'month': {
                // Get the last day of the selected month
                const lastDay = new Date(year, month + 1, 0).getDate();
                return `1 ${monthName} - ${lastDay} ${monthName} ${year}`;
            }
            case 'year':
                return `1 Jan - 31 Dec ${monthName}`;
            default:
                // Get the last day of the selected month
                const lastDay = new Date(year, month + 1, 0).getDate();
                return `1 ${monthName} - ${lastDay} ${monthName} ${year}`;
        }
    }
    
    // Helper function to get month name
    function getMonthName(monthIndex) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[monthIndex];
    }

    // Navigation functions
    async function navigateBack() {
        currentOffset += 5;
        await fetchData();
    }

    async function navigateForward() {
        if (currentOffset >= 5) {
            currentOffset -= 5;
            await fetchData();
        }
    }

    onMount(() => {
        window.addEventListener('resize', handleResize);
        window.addEventListener('click', handleClickOutside);
        fetchData(); // Fetch data on component mount
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleClickOutside);
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        };
    });
</script>

<div class="financial-dashboard">
    <div>
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200">Analysis</h2>
            
            <!-- Period Dropdown -->
            <div class="relative">
                <button id="dropdownDefaultButton" 
                    class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" 
                    type="button"
                    onclick={() => toggleDropdown()}>
                    {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
                    <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                    </svg>
                </button>
                
                <!-- Dropdown menu -->
                {#if isDropdownOpen}
                <div id="dropdown" class="z-10 absolute right-0 mt-2 bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700">
                    <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                        {#each ['month', 'year'] as period}
                            <li>
                                <button onclick={() => handlePeriodChange(period)} class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                                    {period.charAt(0).toUpperCase() + period.slice(1)}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
                {/if}
            </div>
        </div>

        {#if isLoading}
            <!-- Loading Spinner -->
            <div class="flex justify-center items-center p-20">
                <div class="animate-spin inline-block size-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
        {:else if error}
            <!-- Error Message -->
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-800 dark:text-red-200 mb-6">
                <strong class="font-bold">Error!</strong>
                <span class="block sm:inline"> {error}</span>
            </div>
        {:else if chartData.length === 0}
            <!-- No Data Message -->
            <div class="flex flex-col items-center justify-center p-8 text-center bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 mb-6">
                <svg class="size-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">No data available</h3>
                <p class="text-gray-500 mt-1">Try adjusting your filters or adding new transactions</p>
            </div>
        {:else}
            <!-- Date Range Display -->
            <div class="text-gray-600 dark:text-gray-400 mb-4">
                {getDateRangeText()}
            </div>

            <!-- Chart Container -->
            <div class="chart-container bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 relative" bind:this={chartContainer}>
                <!-- Navigation Buttons -->
                <button 
                    class="navigation-button left-2"
                    onclick={() => navigateBack()}
                    aria-label="View previous periods">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    class="navigation-button right-2 {currentOffset === 0 ? 'invisible' : ''}"
                    onclick={() => navigateForward()}
                    aria-label="View next periods">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                <canvas bind:this={canvas}></canvas>
            </div>

            <!-- Summary Stats -->
            <div class="summary-stats mb-6">
                <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <!-- Income Card -->
                    <div class="stat-card flex flex-col">
                        <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Income</span>
                        <div class="flex items-center space-x-1.5 sm:space-x-2">
                            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
                            <span class="text-lg sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                {formatEuro(selectedBarData.income)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Expenses Card -->
                    <div class="stat-card flex flex-col">
                        <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Expenses</span>
                        <div class="flex items-center space-x-1.5 sm:space-x-2">
                            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
                            <span class="text-lg sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                {formatEuro(selectedBarData.expenses)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Net Card -->
                    <div class="stat-card flex flex-col">
                        <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Net</span>
                        <div class="flex items-center space-x-1.5 sm:space-x-2">
                            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" 
                                 class:bg-green-500={selectedBarData.net > 0} 
                                 class:bg-red-500={selectedBarData.net < 0} 
                                 class:bg-gray-500={selectedBarData.net === 0}></div>
                            <span class="text-lg sm:text-2xl font-semibold tracking-tight" 
                                  class:text-green-600={selectedBarData.net > 0} 
                                  class:text-red-600={selectedBarData.net < 0}
                                  class:text-gray-600={selectedBarData.net === 0}
                                  class:dark:text-green-400={selectedBarData.net > 0}
                                  class:dark:text-red-400={selectedBarData.net < 0}
                                  class:dark:text-gray-400={selectedBarData.net === 0}>
                                {formatEuro(selectedBarData.net)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Pie Chart -->
            {#if selectedBarData.categories?.length > 0}
                <CategoryPieChart data={processCategories(selectedBarData.categories)} />
            {/if}
        {/if}
    </div>
</div>

<style>
    .financial-dashboard {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }
    
    .chart-container {
        height: 200px;
        width: 100%;
        margin-bottom: 1rem;
    }
    
    .stat-card {
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 1rem;
        border: 1px solid rgba(229, 231, 235, 0.5);
        transition: all 0.2s ease-in-out;
    }
    
    .stat-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    /* Dark mode support */
    :global(.dark) .stat-card {
        background-color: rgba(31, 41, 55, 0.8);
        border-color: rgba(55, 65, 81, 0.5);
    }

    .navigation-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background-color: rgba(255, 255, 255, 0.8);
        color: #4B5563;
        padding: 0.375rem;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        z-index: 10;
        border: 1px solid #E5E7EB;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        line-height: 0;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .navigation-button:hover {
        background-color: rgba(255, 255, 255, 0.95);
        color: #1F2937;
    }

    :global(.dark) .navigation-button {
        background-color: rgba(31, 41, 55, 0.8);
        color: #9CA3AF;
        border-color: #374151;
    }

    :global(.dark) .navigation-button:hover {
        background-color: rgba(31, 41, 55, 0.95);
        color: #F3F4F6;
    }

    @media (max-width: 640px) {
        .stat-card {
            padding: 0.75rem;
            font-size: 0.875rem;
        }
        
        .chart-container {
            height: 180px;
        }
    }
</style>