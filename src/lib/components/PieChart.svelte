<!-- Pie chart component -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    import {
        ArcElement,
        Tooltip,
        Legend
    } from 'chart.js';

    // Register Chart.js components
    Chart.register(
        ArcElement,
        Tooltip,
        Legend
    );

    type CategoryData = {
        id: string;
        name: string;
        amount: number;
        color?: string;
    };

    type Props = {
        data: CategoryData[];
        title: string;
        type: 'income' | 'expense';
    };

    const props = $props<Props>();

    let chartInstance: Chart | null = null;
    let canvas: HTMLCanvasElement;

    // Preline UI color palette
    const COLORS = {
        income: [
            'rgba(16, 185, 129, 0.8)',  // emerald-500
            'rgba(14, 165, 233, 0.8)',  // sky-500
            'rgba(99, 102, 241, 0.8)',  // indigo-500
            'rgba(168, 85, 247, 0.8)',  // purple-500
            'rgba(236, 72, 153, 0.8)',  // pink-500
            'rgba(139, 92, 246, 0.8)'   // violet-500
        ],
        expense: [
            'rgba(239, 68, 68, 0.8)',   // red-500
            'rgba(249, 115, 22, 0.8)',  // orange-500
            'rgba(245, 158, 11, 0.8)',  // amber-500
            'rgba(234, 179, 8, 0.8)',   // yellow-500
            'rgba(132, 204, 22, 0.8)',  // lime-500
            'rgba(34, 197, 94, 0.8)'    // green-500
        ]
    };

    // Slightly darker versions for borders
    const BORDER_COLORS = {
        income: [
            'rgb(16, 185, 129)',   // emerald-500
            'rgb(14, 165, 233)',   // sky-500
            'rgb(99, 102, 241)',   // indigo-500
            'rgb(168, 85, 247)',   // purple-500
            'rgb(236, 72, 153)',   // pink-500
            'rgb(139, 92, 246)'    // violet-500
        ],
        expense: [
            'rgb(239, 68, 68)',    // red-500
            'rgb(249, 115, 22)',   // orange-500
            'rgb(245, 158, 11)',   // amber-500
            'rgb(234, 179, 8)',    // yellow-500
            'rgb(132, 204, 22)',   // lime-500
            'rgb(34, 197, 94)'     // green-500
        ]
    };

    function updateChart() {
        if (!props.data || props.data.length === 0 || !canvas) {
            return;
        }

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        const total = props.data.reduce((sum, item) => sum + item.amount, 0);
        const colors = COLORS[props.type];
        const borders = BORDER_COLORS[props.type];

        const config = {
            type: 'pie' as const,
            data: {
                labels: props.data.map(d => d.name),
                datasets: [{
                    data: props.data.map(d => d.amount),
                    backgroundColor: props.data.map((_, i) => colors[i % colors.length]),
                    borderColor: props.data.map((_, i) => borders[i % borders.length]),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right' as const,
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i] as number;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: $${value.toLocaleString()} (${percentage}%)`,
                                            fillStyle: colors[i % colors.length],
                                            strokeStyle: borders[i % borders.length],
                                            lineWidth: 1,
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: [
                            props.title,
                            `Total: $${total.toLocaleString()}`
                        ],
                        font: {
                            family: "'Inter', sans-serif",
                            size: 14,
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
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw as number;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `$${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        chartInstance = new Chart(canvas, config);
    }

    $effect(() => {
        if (props.data && canvas) {
            updateChart();
        }
    });

    onMount(() => {
        if (props.data && canvas) {
            updateChart();
        }
        return () => {
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        };
    });
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-4 md:p-5">
    <div class="flex flex-col">
        <div class="-m-1.5 overflow-x-auto">
            <div class="p-1.5 min-w-full inline-block align-middle">
                <div class="pie-chart-container">
                    <canvas bind:this={canvas}></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .pie-chart-container {
        position: relative;
        height: 300px;
        width: 100%;
    }

    .pie-chart-container canvas {
        width: 100% !important;
        height: 100% !important;
    }
</style> 