<script lang="ts">
    import type { DateRangeFilter } from '$lib/types/filters';
    import { Calendar } from '$lib/components/ui/calendar';
    import { Button } from '$lib/components/ui/button';
    import * as Popover from '$lib/components/ui/popover';
    import { createEventDispatcher } from 'svelte';
    import CalendarIcon from 'lucide-svelte/icons/calendar';
    import { DateFormatter, type DateValue, getLocalTimeZone, today, parseDate } from "@internationalized/date";
    import { cn } from '$lib/utils';

    const dispatch = createEventDispatcher<{
        change: DateRangeFilter;
    }>();

    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

    let { dateRange } = $props<{
        dateRange: DateRangeFilter;
    }>();

    let fromDate = $state<DateValue | undefined>(dateRange.from ? parseDate(dateRange.from) : undefined);
    let toDate = $state<DateValue | undefined>(dateRange.to ? parseDate(dateRange.to) : undefined);

    // Watch for date changes
    $effect(() => {
        if (fromDate !== undefined || toDate !== undefined) {
            onDateChange();
        }
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

    function setLastMonth() {
        const currentDate = today(getLocalTimeZone());
        const lastMonth = currentDate.subtract({ months: 1 });
        fromDate = lastMonth;
        toDate = currentDate;
    }

    function setLastYear() {
        const currentDate = today(getLocalTimeZone());
        const lastYear = currentDate.subtract({ years: 1 });
        fromDate = lastYear;
        toDate = currentDate;
    }
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700 p-4">
    <div class="flex flex-col gap-4">
        <div class="flex gap-2">
            <Button variant="outline" on:click={setLastMonth}>Last Month</Button>
            <Button variant="outline" on:click={setLastYear}>Last Year</Button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="relative">
                <label class="block text-sm font-medium mb-2 dark:text-white">From</label>
                <Popover.Root>
                    <Popover.Trigger asChild let:builder>
                        <Button
                            variant="outline"
                            class={cn("w-[280px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            builders={[builder]}
                        >
                            <CalendarIcon class="mr-2 h-4 w-4" />
                            {fromDate ? df.format(fromDate.toDate(getLocalTimeZone())) : "Pick a date"}
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
                <label class="block text-sm font-medium mb-2 dark:text-white">To</label>
                <Popover.Root>
                    <Popover.Trigger asChild let:builder>
                        <Button
                            variant="outline"
                            class={cn("w-[280px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            builders={[builder]}
                        >
                            <CalendarIcon class="mr-2 h-4 w-4" />
                            {toDate ? df.format(toDate.toDate(getLocalTimeZone())) : "Pick a date"}
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