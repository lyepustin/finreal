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
    const { data = [], title = 'Spending by category', triggerAutoCycle = 0 } = $props<{
        data: CategoryData[];
        title?: string;
        triggerAutoCycle?: number;
    }>();

    // State
    let chartInstance: Chart | null = null;
    let canvas: HTMLCanvasElement;
    let chartContainer: HTMLDivElement;
    let selectedCategory = $state<CategoryData | null>(null);
    let isAutoCycling = $state(false);
    let autoCycleInterval: number | null = $state(null);
    let preventAutoStart = $state(false);
    let isAutoCycleInProgress = $state(false);
    let userHasInteracted = $state(false);

    // Colors for the chart (using softer pastel colors)
    const COLORS = [
        'rgba(74, 222, 128, 0.8)',   // light green
        'rgba(192, 132, 252, 0.8)',  // light purple
        'rgba(96, 165, 250, 0.8)',   // light blue
        'rgba(251, 191, 36, 0.8)',   // light amber
        'rgba(248, 113, 113, 0.8)',  // light red
        'rgba(209, 213, 219, 0.8)'   // light gray for "Others"
    ];

    // Highlight colors (slightly more vibrant versions)
    const HIGHLIGHT_COLORS = [
        'rgba(74, 222, 128, 0.9)',   // light green
        'rgba(192, 132, 252, 0.9)',  // light purple
        'rgba(96, 165, 250, 0.9)',   // light blue
        'rgba(251, 191, 36, 0.9)',   // light amber
        'rgba(248, 113, 113, 0.9)',  // light red
        'rgba(209, 213, 219, 0.9)'   // light gray for "Others"
    ];

    // Dimmed colors (less dim than before)
    const DIMMED_COLORS = [
        'rgba(74, 222, 128, 0.5)',   // light green
        'rgba(192, 132, 252, 0.5)',  // light purple
        'rgba(96, 165, 250, 0.5)',   // light blue
        'rgba(251, 191, 36, 0.5)',   // light amber
        'rgba(248, 113, 113, 0.5)',  // light red
        'rgba(209, 213, 219, 0.5)'   // light gray for "Others"
    ];

    function formatEuro(value: number): string {
        return `${Math.round(value).toLocaleString()}€`;
    }

    // Track if chart is ready
    let isChartReady = $state(false);

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
                    hoverBackgroundColor: HIGHLIGHT_COLORS,
                    borderWidth: 2,
                    borderColor: 'transparent',
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
                animation: {
                    duration: (context) => {
                        // Only animate on initial render
                        return context.initial ? 1000 : 0;
                    },
                    onComplete: () => {
                        isChartReady = true;
                        // Start auto cycling only after first render is complete and if not prevented
                        if (!isAutoCycling && !selectedCategory && !preventAutoStart) {
                            startAutoCycle();
                        }
                    }
                },
                onClick: (event, elements) => {
                    // Prevent the event from bubbling up to the window click handler
                    event.native?.stopPropagation();
                    
                    // Stop auto cycling when user interacts with chart
                    stopAutoCycle();
                    preventAutoStart = true;
                    
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        // If clicking the same category, do nothing
                        if (selectedCategory?.id !== data[index].id) {
                            selectedCategory = data[index];
                            updateCategoryHighlight(index);
                        }
                    } else {
                        // Clicked empty space, deselect
                        selectedCategory = null;
                        resetChartColors();
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
                        
                        // Create a larger clickable area (40x40 px around the emoji center)
                        const touchArea = {
                            x: x - 20,
                            y: y - 20,
                            width: 40,
                            height: 40,
                            index: i
                        };
                        
                        // Store both the pie segment area and the emoji touch area
                        chart.emojiAreas.push({
                            emoji: touchArea,
                            segment: {
                                startAngle: currentAngle,
                                endAngle: currentAngle + angle,
                                radius,
                                centerX,
                                centerY,
                                index: i
                            }
                        });
                        
                        // Draw emoji
                        ctx.fillStyle = selectedCategory ? 
                            (data[i].id === selectedCategory.id ? '#000' : 'rgba(0, 0, 0, 0.3)') : 
                            '#000';
                        ctx.fillText(chart.data.labels[i], x, y);
                        
                        // Debug: Draw touch area (uncomment to see touch areas)
                        // ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
                        // ctx.strokeRect(touchArea.x, touchArea.y, touchArea.width, touchArea.height);
                        
                        currentAngle += angle;
                    });
                    
                    ctx.restore();
                }
            }]
        };

        chartInstance = new Chart(canvas, config);
    }

    function updateCategoryHighlight(selectedIndex: number) {
        if (!chartInstance) return;

        // Update segment colors
        chartInstance.data.datasets[0].backgroundColor = COLORS.map((_, i) => 
            i === selectedIndex ? HIGHLIGHT_COLORS[i] : DIMMED_COLORS[i]
        );

        // Update segment borders
        chartInstance.data.datasets[0].borderColor = COLORS.map((_, i) => 
            i === selectedIndex ? HIGHLIGHT_COLORS[i] : 'transparent'
        );

        // Use a more efficient update
        chartInstance.update('none');
    }

    function resetChartColors() {
        if (!chartInstance) return;
        
        // Reset all colors to default
        chartInstance.data.datasets[0].backgroundColor = COLORS;
        chartInstance.data.datasets[0].borderColor = COLORS.map(() => 'transparent');
        
        // Use a more efficient update
        chartInstance.update('none');
    }

    // Check if a point is inside an emoji area or pie segment
    function isPointInEmojiArea(x: number, y: number, area: any) {
        // Check if point is in emoji touch area
        if (area.emoji) {
            const touch = area.emoji;
            return x >= touch.x && x <= touch.x + touch.width && 
                   y >= touch.y && y <= touch.y + touch.height;
        }
        return false;
    }

    function isPointInPieSegment(x: number, y: number, segment: any) {
        // Calculate distance from click to center
        const dx = x - segment.centerX;
        const dy = y - segment.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if click is within the pie radius
        if (distance <= segment.radius) {
            // Calculate angle of click
            let angle = Math.atan2(dy, dx);
            if (angle < 0) angle += 2 * Math.PI; // Convert to 0-2π range
            
            // Normalize segment angles to 0-2π range
            let startAngle = segment.startAngle;
            let endAngle = segment.endAngle;
            if (startAngle < 0) {
                startAngle += 2 * Math.PI;
                endAngle += 2 * Math.PI;
            }
            
            // Check if angle is within segment
            return angle >= startAngle && angle <= endAngle;
        }
        return false;
    }

    // Handle any click
    function handleClick(event: MouseEvent) {
        if (!chartInstance) return;

        // Mark that user has interacted with the chart
        userHasInteracted = true;
        
        // Get click position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if we clicked on an emoji or pie segment
        const areas = (chartInstance as any).emojiAreas || [];
        const clickedArea = areas.find(area => 
            isPointInEmojiArea(x, y, area) || isPointInPieSegment(x, y, area.segment)
        );

        if (clickedArea) {
            // Permanently stop auto cycling
            permanentlyStopAutoCycle();

            const index = clickedArea.emoji.index;
            if (selectedCategory?.id !== data[index].id) {
                selectedCategory = data[index];
                updateCategoryHighlight(index);
            }
            return;
        }

        // Only handle other clicks if they're outside the chart canvas
        if (canvas.contains(event.target as Node)) return;
        
        // Permanently stop auto cycling for any chart interaction
        permanentlyStopAutoCycle();
        
        // If we clicked outside and there's a selection, deselect
        if (selectedCategory) {
            selectedCategory = null;
            resetChartColors();
        }
    }

    // Function to permanently stop auto cycle
    function permanentlyStopAutoCycle() {
        stopAutoCycle();
        userHasInteracted = true;
        preventAutoStart = true;
    }

    // Auto cycle through categories
    function startAutoCycle() {
        // Never start if user has interacted
        if (!data || data.length === 0 || !isChartReady || isAutoCycleInProgress || userHasInteracted) return;
        
        isAutoCycling = true;
        isAutoCycleInProgress = true;

        let currentIndex = 0;
        let cycleCount = 0;
        const totalCycles = data.length;

        // Initial 5-second delay before starting any movement
        setTimeout(() => {
            // Select the first (largest) category
            selectCategory(currentIndex);

            // Set up the interval to cycle through categories
            autoCycleInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % data.length;
                cycleCount++;
                
                selectCategory(currentIndex);
                
                // Check if we've completed one full cycle
                if (cycleCount >= totalCycles) {
                    stopAutoCycle();
                }
            }, 1500) as unknown as number;
        }, 2500); // 5-second delay before starting the auto-cycle
    }

    function stopAutoCycle() {
        if (autoCycleInterval) {
            clearInterval(autoCycleInterval);
            autoCycleInterval = null;
        }
        isAutoCycling = false;
        isAutoCycleInProgress = false;
        preventAutoStart = true; // Prevent auto-cycle from restarting
    }

    function selectCategory(index: number) {
        if (!chartInstance || !data[index]) return;
        
        selectedCategory = data[index];
        // Ensure chart is ready before updating visuals
        if (isChartReady && chartInstance.ctx) {
            updateCategoryHighlight(index);
        }
    }

    onMount(() => {
        preventAutoStart = false; // Reset the flag on initial mount
        updateChart();
        // Add click listener
        window.addEventListener('click', handleClick);
        // Note: Auto cycling will start after chart animation completes
        
        return () => {
            if (chartInstance) {
                chartInstance.destroy();
            }
            // Remove click listener
            window.removeEventListener('click', handleClick);
            // Clean up auto cycle
            stopAutoCycle();
        };
    });

    // Add effect to watch for triggerAutoCycle changes
    $effect(() => {
        // Never restart auto cycle if user has interacted
        if (triggerAutoCycle > 0 && !isAutoCycling && isChartReady && !userHasInteracted) {
            preventAutoStart = false;
            startAutoCycle();
        }
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