<!-- Bar chart component -->
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

    // Register Chart.js components
    Chart.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    );

    type Props = {
        chartData: Array<{ period: string; income: number; expenses: number }>;
        periodType?: 'month' | 'week';
    };

    const props = $props<Props>();
    const periodType = props.periodType ?? 'month';

    let chartInstance: Chart | null = null;
    let chartContainer: HTMLDivElement;
    let canvas: HTMLCanvasElement;

    function formatPeriod(period: string, type: 'month' | 'week' = 'month') {
        if (type === 'month') {
            const [year, month] = period.split('-');
            return `${month}/${year}`;
        } else {
            const [year, week] = period.split('-W');
            return `W${week}/${year}`;
        }
    }

    function updateChart() {
        if (!props.chartData || props.chartData.length === 0 || !canvas) {
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

        const config = {
            type: 'bar' as const,
            data: {
                labels: props.chartData.map(d => formatPeriod(d.period, periodType)),
                datasets: [
                    {
                        label: 'Income',
                        data: props.chartData.map(d => d.income),
                        backgroundColor: '#a8e6cf80',
                        borderColor: '#a8e6cf',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: props.chartData.map(d => d.expenses),
                        backgroundColor: '#ffb3ba80',
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
                            text: periodType === 'month' ? 'Months' : 'Weeks'
                        }
                    }
                }
            }
        };

        chartInstance = new Chart(canvas, config);
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

    $effect(() => {
        if (props.chartData && canvas) {
            updateChart();
        }
    });

    onMount(() => {
        window.addEventListener('resize', handleResize);
        if (props.chartData && canvas) {
            updateChart();
        }
        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        };
    });
</script>

<div 
    class="chart-container" 
    bind:this={chartContainer}
>
    <canvas bind:this={canvas}></canvas>
</div>

<style>
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
</style> 