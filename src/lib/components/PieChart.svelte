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

    // Predefined colors from the palette
    const COLORS = {
        income: [
            '#7E9680', // Sage green
            '#79616F', // Mauve
            '#AE6378', // Rose
            '#D87F81', // Coral
            '#EAB595', // Peach
            '#A16378'  // Sage green with opacity for Others
        ],
        expense: [
            '#EAB595', // Peach
            '#D87F81', // Coral
            '#AE6378', // Rose
            '#79616F', // Mauve
            '#7E9680', // Sage green
            '#2AB595'  // Peach with opacity for Others
        ]
    };

    // Slightly darker versions for borders
    const BORDER_COLORS = {
        income: [
            '#7E9680',
            '#79616F',
            '#AE6378',
            '#D87F81',
            '#EAB595',
            '#7E9680'
        ],
        expense: [
            '#EAB595',
            '#D87F81',
            '#AE6378',
            '#79616F',
            '#7E9680',
            '#EAB595'
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
                    backgroundColor: props.data.map((_, i) => colors[i]),
                    borderColor: props.data.map((_, i) => borders[i]),
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
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i] as number;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: $${value.toLocaleString()} (${percentage}%)`,
                                            fillStyle: colors[i],
                                            strokeStyle: borders[i],
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
                            size: 14
                        }
                    },
                    tooltip: {
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

<div class="pie-chart-container">
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    .pie-chart-container {
        position: relative;
        height: 300px;
        background-color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .pie-chart-container canvas {
        width: 100% !important;
        height: 100% !important;
    }
</style> 