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
        dateStyle: "long"
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
    <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
            <!-- Month Navigation -->
            <div class="flex items-center justify-between p-2 border rounded-lg dark:border-gray-700">
                <button 
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
                    onclick={setPreviousMonth}
                >
                    <ChevronLeftIcon class="h-4 w-4" />
                </button>
                <span class="text-sm font-medium">
                    {monthFormatter.format(currentPeriodStart.toDate(getLocalTimeZone()))}
                </span>
                <button 
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
                    onclick={setNextMonth}
                    disabled={isCurrentOrFutureMonth(currentPeriodStart)}
                >
                    <ChevronRightIcon class="h-4 w-4" />
                </button>
            </div>

            <!-- Year Navigation -->
            <div class="flex items-center justify-between p-2 border rounded-lg dark:border-gray-700">
                <button 
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
                    onclick={setPreviousYear}
                >
                    <ChevronLeftIcon class="h-4 w-4" />
                </button>
                <span class="text-sm font-medium">
                    {yearFormatter.format(currentPeriodStart.toDate(getLocalTimeZone()))}
                </span>
                <button 
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50"
                    onclick={setNextYear}
                    disabled={isCurrentOrFutureYear(currentPeriodStart)}
                >
                    <ChevronRightIcon class="h-4 w-4" />
                </button>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2 items-center">
            <div class="relative">
                <Popover.Root>
                    <Popover.Trigger asChild let:builder>
                        <Button
                            variant="outline"
                            class={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            builders={[builder]}
                        >
                            <CalendarIcon class="mr-2 h-4 w-4" />
                            {fromDate ? df.format(fromDate.toDate(getLocalTimeZone())) : "Start date"}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-auto p-0">
                        <Calendar 
                            bind:value={fromDate}
                            mode="single"
                            initialFocus
                            maxValue={toDate}
                        />
                    </Popover.Content>
                </Popover.Root>
            </div>

            <div class="relative">
                <Popover.Root>
                    <Popover.Trigger asChild let:builder>
                        <Button
                            variant="outline"
                            class={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            builders={[builder]}
                        >
                            <CalendarIcon class="mr-2 h-4 w-4" />
                            {toDate ? df.format(toDate.toDate(getLocalTimeZone())) : "End date"}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-auto p-0">
                        <Calendar
                            bind:value={toDate}
                            mode="single"
                            initialFocus
                            minValue={fromDate}
                        />
                    </Popover.Content>
                </Popover.Root>
            </div>
        </div>
    </div>
</div> 