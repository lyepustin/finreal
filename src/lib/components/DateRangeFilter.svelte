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

    let fromDate = $state<DateValue | undefined>(dateRange.from ? parseDate(dateRange.from) : undefined);
    let toDate = $state<DateValue | undefined>(dateRange.to ? parseDate(dateRange.to) : undefined);
    let currentPeriodStart = $state<DateValue>(today(getLocalTimeZone()));

    // Initialize currentPeriodStart based on fromDate
    $effect(() => {
        if (fromDate) {
            currentPeriodStart = fromDate;
        }
    });

    // Watch for date changes
    $effect(() => {
        const checkDates = () => {
            if (fromDate !== undefined || toDate !== undefined) {
                onDateChange();
            }
        };
        checkDates();
    });

    // Set initial date range if not set
    $effect(() => {
        const initializeDates = () => {
            if (!fromDate && !toDate) {
                const now = today(getLocalTimeZone());
                // Set to first day of current month
                fromDate = parseDate(`${now.toString().split('T')[0].slice(0, 7)}-01`);
                // Set to last day of current month
                toDate = getLastDayOfMonth(fromDate);
                currentPeriodStart = fromDate;
            }
        };
        initializeDates();
    });

    function onDateChange() {
        const newDateRange = {
            from: fromDate ? fromDate.toString().split('T')[0] : '',
            to: toDate ? toDate.toString().split('T')[0] : ''
        };
        
        if (newDateRange.from !== dateRange.from || newDateRange.to !== dateRange.to) {
            dispatch('change', newDateRange);
            dateRange = newDateRange;
        }
    }

    function setPreviousMonth() {
        const newStart = currentPeriodStart.subtract({ months: 1 });
        // Set to first day of the month
        const monthStart = parseDate(`${newStart.toString().split('T')[0].slice(0, 7)}-01`);
        const lastDayOfMonth = getLastDayOfMonth(monthStart);
        fromDate = monthStart;
        toDate = lastDayOfMonth;
        currentPeriodStart = monthStart;
    }

    function setPreviousYear() {
        const newStart = currentPeriodStart.subtract({ years: 1 });
        // Set to January 1st of the selected year
        const yearStart = parseDate(`${newStart.toString().split('-')[0]}-01-01`);
        // Set to December 31st of the selected year
        const yearEnd = parseDate(`${newStart.toString().split('-')[0]}-12-31`);
        fromDate = yearStart;
        toDate = yearEnd;
        currentPeriodStart = yearStart;
    }

    function getLastDayOfMonth(date: DateValue) {
        // Get the first day of next month and subtract one day
        const nextMonth = date.add({ months: 1 });
        const firstDayNextMonth = parseDate(`${nextMonth.toString().split('T')[0].slice(0, 7)}-01`);
        return firstDayNextMonth.subtract({ days: 1 });
    }

    function setNextMonth() {
        if (isCurrentOrFutureMonth(currentPeriodStart)) return;
        const newStart = currentPeriodStart.add({ months: 1 });
        // Set to first day of the month
        const monthStart = parseDate(`${newStart.toString().split('T')[0].slice(0, 7)}-01`);
        const lastDayOfMonth = getLastDayOfMonth(monthStart);
        fromDate = monthStart;
        toDate = lastDayOfMonth;
        currentPeriodStart = monthStart;
    }

    function setNextYear() {
        if (isCurrentOrFutureYear(currentPeriodStart)) return;
        const newStart = currentPeriodStart.add({ years: 1 });
        // Set to January 1st of the selected year
        const yearStart = parseDate(`${newStart.toString().split('-')[0]}-01-01`);
        // Set to December 31st of the selected year
        const yearEnd = parseDate(`${newStart.toString().split('-')[0]}-12-31`);
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

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-4">
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
                    variant="outline"
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