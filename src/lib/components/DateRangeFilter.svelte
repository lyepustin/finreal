<script lang="ts">
    import type { DateRangeFilter } from '$lib/types/filters';
    import { Calendar } from '$lib/components/ui/calendar';
    import { Button } from '$lib/components/ui/button';
    import * as Popover from '$lib/components/ui/popover';
    import { createEventDispatcher } from 'svelte';
    import CalendarIcon from 'lucide-svelte/icons/calendar';
    import ChevronLeftIcon from 'lucide-svelte/icons/chevron-left';
    import ChevronRightIcon from 'lucide-svelte/icons/chevron-right';
    import { DateFormatter, type DateValue, getLocalTimeZone, today, parseDate } from "@internationalized/date";
    import { cn } from '$lib/utils';
    import { getDefaultMonthDateRange } from '$lib/utils/dates';

    const dispatch = createEventDispatcher<{
        change: DateRangeFilter;
    }>();

    const df = new DateFormatter("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    const monthFormatter = new DateFormatter("en-US", {
        month: "short",
        year: "numeric"
    });

    const yearFormatter = new DateFormatter("en-US", {
        year: "numeric"
    });

    let { dateRange } = $props<{
        dateRange: DateRangeFilter;
    }>();

    let fromDate = $state<DateValue | undefined>(undefined);
    let toDate = $state<DateValue | undefined>(undefined);
    let currentPeriodStart = $state<DateValue>(today(getLocalTimeZone()));
    let isInitialized = $state(false);
    let previousDateRange = $state<DateRangeFilter>({ from: '', to: '' });

    // Initialize dates from props
    $effect(() => {
        if (isInitialized && 
            dateRange.from === previousDateRange.from && 
            dateRange.to === previousDateRange.to) {
            return;
        }
        
        try {
            // Store current dateRange for comparison
            previousDateRange = { ...dateRange };
            
            // Try to parse dates from props
            if (dateRange.from) {
                fromDate = parseDate(dateRange.from);
                currentPeriodStart = fromDate;
            }
            
            if (dateRange.to) {
                toDate = parseDate(dateRange.to);
            }
            
            // If either date is missing, set default values
            if (!fromDate || !toDate) {
                initializeDefaultDates();
            }
            
            isInitialized = true;
        } catch (error) {
            console.error("Error parsing dates:", error);
            initializeDefaultDates();
            isInitialized = true;
        }
    });

    // Initialize currentPeriodStart based on fromDate
    $effect(() => {
        if (fromDate) {
            currentPeriodStart = fromDate;
        }
    });

    // Watch for date changes
    $effect(() => {
        if (!isInitialized) return;
        
        const checkDates = () => {
            if (fromDate !== undefined || toDate !== undefined) {
                onDateChange();
            }
        };
        checkDates();
    });

    function initializeDefaultDates() {
        // Get default date range using the utility function
        const defaultRange = getDefaultMonthDateRange();
        
        // Parse the dates
        fromDate = parseDate(defaultRange.from);
        toDate = parseDate(defaultRange.to);
        
        currentPeriodStart = fromDate;
    }

    function onDateChange() {
        if (!fromDate || !toDate) return;
        
        const newDateRange = {
            from: fromDate.toString().split('T')[0],
            to: toDate.toString().split('T')[0]
        };
        
        if (newDateRange.from !== dateRange.from || newDateRange.to !== dateRange.to) {
            dispatch('change', newDateRange);
            dateRange = newDateRange;
            previousDateRange = { ...newDateRange };
        }
    }

    // Set initial date range if not set
    $effect(() => {
        if (!isInitialized) return;
        
        if (!fromDate || !toDate) {
            initializeDefaultDates();
        }
    });

    function setPreviousMonth() {
        const newStart = currentPeriodStart.subtract({ months: 1 });
        // Set to first day of the month
        const monthStr = newStart.toString().split('-')[1];
        const yearStr = newStart.toString().split('-')[0];
        const monthStart = parseDate(`${yearStr}-${monthStr}-01`);
        const lastDayOfMonth = getLastDayOfMonth(monthStart);
        fromDate = monthStart;
        toDate = lastDayOfMonth;
        currentPeriodStart = monthStart;
    }

    function setPreviousYear() {
        const newStart = currentPeriodStart.subtract({ years: 1 });
        // Set to January 1st of the selected year
        const yearStr = newStart.toString().split('-')[0];
        const yearStart = parseDate(`${yearStr}-01-01`);
        // Set to December 31st of the selected year
        const yearEnd = parseDate(`${yearStr}-12-31`);
        fromDate = yearStart;
        toDate = yearEnd;
        currentPeriodStart = yearStart;
    }

    function getLastDayOfMonth(date: DateValue) {
        // Get the year and month
        const parts = date.toString().split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        
        // Create a date for the first day of the next month
        // Then subtract one day to get the last day of the current month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextMonthYear = month === 12 ? year + 1 : year;
        
        // Format with leading zeros
        const nextMonthStr = nextMonth.toString().padStart(2, '0');
        const nextMonthYearStr = nextMonthYear.toString();
        
        // Create the first day of next month
        const firstDayNextMonth = parseDate(`${nextMonthYearStr}-${nextMonthStr}-01`);
        
        // Subtract one day to get the last day of the current month
        return firstDayNextMonth.subtract({ days: 1 });
    }

    function setNextMonth() {
        if (isCurrentOrFutureMonth(currentPeriodStart)) return;
        const newStart = currentPeriodStart.add({ months: 1 });
        // Set to first day of the month
        const monthStr = newStart.toString().split('-')[1];
        const yearStr = newStart.toString().split('-')[0];
        const monthStart = parseDate(`${yearStr}-${monthStr}-01`);
        const lastDayOfMonth = getLastDayOfMonth(monthStart);
        fromDate = monthStart;
        toDate = lastDayOfMonth;
        currentPeriodStart = monthStart;
    }

    function setNextYear() {
        if (isCurrentOrFutureYear(currentPeriodStart)) return;
        const newStart = currentPeriodStart.add({ years: 1 });
        // Set to January 1st of the selected year
        const yearStr = newStart.toString().split('-')[0];
        const yearStart = parseDate(`${yearStr}-01-01`);
        // Set to December 31st of the selected year
        const yearEnd = parseDate(`${yearStr}-12-31`);
        fromDate = yearStart;
        toDate = yearEnd;
        currentPeriodStart = yearStart;
    }

    function isCurrentOrFutureMonth(date: DateValue) {
        const currentDate = today(getLocalTimeZone());
        return date.compare(currentDate.subtract({ months: 1 })) > 0;
    }

    function isCurrentOrFutureYear(date: DateValue) {
        const currentDate = today(getLocalTimeZone());
        return date.compare(currentDate.subtract({ years: 1 })) > 0;
    }
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
    <div class="flex items-center justify-between gap-2">
        <!-- Year back -->
        <button 
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
            onclick={setPreviousYear}
        >
            <div class="flex">
                <ChevronLeftIcon class="h-4 w-4" />
                <ChevronLeftIcon class="h-4 w-4 -ml-2" />
            </div>
        </button>
        
        <!-- Month back -->
        <button 
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
            onclick={setPreviousMonth}
        >
            <ChevronLeftIcon class="h-4 w-4" />
        </button>

        <!-- Date Range Display -->
        <Popover.Root>
            <Popover.Trigger asChild let:builder>
                <Button
                    variant="ghost"
                    class={cn("justify-center text-sm font-medium", !fromDate && "text-muted-foreground")}
                    builders={[builder]}
                >
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    {#if fromDate && toDate}
                        {df.format(fromDate.toDate(getLocalTimeZone()))} to {df.format(toDate.toDate(getLocalTimeZone()))}
                    {:else}
                        Select date range
                    {/if}
                </Button>
            </Popover.Trigger>
            <Popover.Content class="w-auto p-4">
                <div class="grid gap-4">
                    <div class="grid gap-2">
                        <div class="grid grid-cols-2 gap-2">
                            <Calendar 
                                bind:value={fromDate}
                                mode="single"
                                initialFocus
                                maxValue={toDate}
                            />
                            <Calendar
                                bind:value={toDate}
                                mode="single"
                                initialFocus
                                minValue={fromDate}
                            />
                        </div>
                    </div>
                </div>
            </Popover.Content>
        </Popover.Root>

        <!-- Month forward -->
        <button 
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
            onclick={setNextMonth}
            disabled={isCurrentOrFutureMonth(currentPeriodStart)}
        >
            <ChevronRightIcon class="h-4 w-4" />
        </button>

        <!-- Year forward -->
        <button 
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
            onclick={setNextYear}
            disabled={isCurrentOrFutureYear(currentPeriodStart)}
        >
            <div class="flex">
                <ChevronRightIcon class="h-4 w-4" />
                <ChevronRightIcon class="h-4 w-4 -ml-2" />
            </div>
        </button>
    </div>
</div> 