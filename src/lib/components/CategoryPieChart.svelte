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
        emoji: string;
    };

    // Props
    const { data = [], title = 'Spending by category' } = $props<{
        data: CategoryData[];
        title?: string;
    }>();

    // State
    let chartInstance: Chart | null = null;
    let canvas: HTMLCanvasElement;
    let chartContainer: HTMLDivElement;
    let selectedCategory = $state<CategoryData | null>(null);

    // Colors for the chart (using softer pastel colors)
    const COLORS = [
        'rgba(74, 222, 128, 0.8)',   // light green
        'rgba(192, 132, 252, 0.8)',  // light purple
        'rgba(96, 165, 250, 0.8)',   // light blue
        'rgba(251, 191, 36, 0.8)',   // light amber
        'rgba(248, 113, 113, 0.8)',  // light red
        'rgba(209, 213, 219, 0.8)'   // light gray for "Others"
    ];

    function formatEuro(value: number): string {
        return `${Math.round(value).toLocaleString()}€`;
    }

    function updateChart() {
        if (!canvas || !data.length) return;

        if (chartInstance) {
            chartInstance.destroy();
        }

        const config = {
            type: 'doughnut' as const,
            data: {
                labels: data.map(d => d.emoji),
                datasets: [{
                    data: data.map(d => Math.abs(d.amount)),
                    backgroundColor: COLORS,
                    hoverBackgroundColor: COLORS.map(color => color.replace('0.8', '1')),
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                layout: {
                    padding: {
                        top: 40,
                        bottom: 40,
                        left: 40,
                        right: 40
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        // If clicking the same category, do nothing (let the window click handler handle it)
                        if (selectedCategory?.id !== data[index].id) {
                            selectedCategory = data[index];
                            // Dim unselected categories
                            chartInstance!.data.datasets[0].backgroundColor = COLORS.map((color, i) => 
                                i === index ? color : color.replace('0.8', '0.3')
                            );
                            chartInstance!.update('none');
                        }
                    }
                }
            },
            plugins: [{
                id: 'emojis',
                afterDraw: (chart) => {
                    const { ctx, width, height } = chart;
                    ctx.save();
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Calculate center and radius
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const radius = Math.min(width, height) / 2 * 0.65; // Reduced to 65% of chart radius

                    // Store emoji positions for click detection
                    chart.emojiAreas = [];

                    // Draw emojis around the chart
                    let total = chart.data.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
                    let currentAngle = -Math.PI / 2; // Start from top

                    chart.data.datasets[0].data.forEach((value: number, i: number) => {
                        const angle = (value / total) * Math.PI * 2;
                        const midAngle = currentAngle + angle / 2;
                        
                        // Position emoji further outside the chart
                        const x = centerX + Math.cos(midAngle) * (radius + 25);
                        const y = centerY + Math.sin(midAngle) * (radius + 25);
                        
                        // Store emoji click area (20x20 px around the emoji center)
                        chart.emojiAreas.push({
                            x: x - 10,
                            y: y - 10,
                            width: 20,
                            height: 20,
                            index: i
                        });
                        
                        // Draw emoji
                        ctx.fillStyle = selectedCategory ? 
                            (data[i].id === selectedCategory.id ? '#000' : 'rgba(0, 0, 0, 0.3)') : 
                            '#000';
                        ctx.fillText(chart.data.labels[i], x, y);
                        
                        currentAngle += angle;
                    });
                    
                    ctx.restore();
                }
            }]
        };

        chartInstance = new Chart(canvas, config);
    }

    // Check if a point is inside an emoji area
    function isPointInEmojiArea(x: number, y: number, area: { x: number, y: number, width: number, height: number }) {
        return x >= area.x && x <= area.x + area.width && 
               y >= area.y && y <= area.y + area.height;
    }

    // Handle any click
    function handleClick(event: MouseEvent) {
        if (!chartInstance) return;

        // Get click position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if we clicked on an emoji
        const emojiAreas = (chartInstance as any).emojiAreas || [];
        const clickedEmoji = emojiAreas.find(area => isPointInEmojiArea(x, y, area));

        // Get chart elements at click position
        const elements = chartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false) || [];
        
        // If we clicked either a pie section or an emoji, and it's different from the current selection
        if ((elements.length > 0 || clickedEmoji) && 
            selectedCategory?.id !== data[clickedEmoji?.index ?? elements[0]?.index ?? -1]?.id) {
            const index = clickedEmoji?.index ?? elements[0].index;
            selectedCategory = data[index];
            // Dim unselected categories
            chartInstance.data.datasets[0].backgroundColor = COLORS.map((color, i) => 
                i === index ? color : color.replace('0.8', '0.3')
            );
            chartInstance.update('none');
            return;
        }
        
        // In any other case (click on empty space or same category), deselect
        if (selectedCategory) {
            selectedCategory = null;
            chartInstance.data.datasets[0].backgroundColor = COLORS;
            chartInstance.update('none');
        }
    }

    onMount(() => {
        updateChart();
        // Add click listener
        window.addEventListener('click', handleClick);
        return () => {
            if (chartInstance) {
                chartInstance.destroy();
            }
            // Remove click listener
            window.removeEventListener('click', handleClick);
        };
    });

    // Add effect to update chart when data changes
    $effect(() => {
        if (data && canvas) {
            updateChart();
        }
    });
</script>

<div class="category-pie-chart bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
    <div class="chart-container relative" style="height: 280px;" bind:this={chartContainer}>
        <!-- Center text -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center z-0 pointer-events-none">
            {#if selectedCategory}
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{selectedCategory.name}</span>
                <span class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatEuro(selectedCategory.amount)}</span>
            {:else}
                <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Spending by</span>
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400">category</span>
                </div>
            {/if}
        </div>
        
        <!-- Chart canvas -->
        <canvas bind:this={canvas} class="relative z-10"></canvas>
    </div>
</div>

<style>
    .category-pie-chart {
        max-width: 100%;
    }
</style> 