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
                        backgroundColor: 'rgba(16, 185, 129, 0.6)', // Tailwind emerald-500 with opacity
                        borderColor: 'rgb(16, 185, 129)', // Tailwind emerald-500
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: props.chartData.map(d => d.expenses),
                        backgroundColor: 'rgba(239, 68, 68, 0.6)', // Tailwind red-500 with opacity
                        borderColor: 'rgb(239, 68, 68)', // Tailwind red-500
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
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Income vs Expenses',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: "'Inter', sans-serif",
                            size: 14
                        },
                        bodyFont: {
                            family: "'Inter', sans-serif",
                            size: 13
                        },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount',
                            font: {
                                family: "'Inter', sans-serif",
                                size: 13
                            }
                        },
                        ticks: {
                            callback: (value) => `$${value.toLocaleString()}`,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)' // Tailwind slate-200 with opacity
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: periodType === 'month' ? 'Months' : 'Weeks',
                            font: {
                                family: "'Inter', sans-serif",
                                size: 13
                            }
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        },
                        grid: {
                            display: false
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

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-4 md:p-5 mb-4">
    <div class="flex flex-col">
        <div class="-m-1.5 overflow-x-auto">
            <div class="p-1.5 min-w-full inline-block align-middle">
                <div 
                    class="chart-container" 
                    bind:this={chartContainer}
                >
                    <canvas bind:this={canvas}></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .chart-container {
        position: relative;
        height: 400px;
        width: 100%;
    }

    .chart-container canvas {
        width: 100% !important;
        height: 100% !important;
    }
</style> 