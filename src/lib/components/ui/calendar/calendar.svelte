<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import * as Calendar from "./index.js";
	import { cn } from "$lib/utils.js";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";

	type $$Props = CalendarPrimitive.Props;

	type $$Events = CalendarPrimitive.Events;

	export let value: $$Props["value"] = undefined;
	export let placeholder: $$Props["placeholder"] = undefined;
	export let weekdayFormat: $$Props["weekdayFormat"] = "short";

	let className: $$Props["class"] = undefined;
	export { className as class };

	function handlePrevYear(e: CustomEvent) {
		const currentDate = value || placeholder;
		if (currentDate) {
			const newDate = currentDate.subtract({ years: 1 });
			value = newDate;
		}
	}

	function handleNextYear(e: CustomEvent) {
		const currentDate = value || placeholder;
		if (currentDate) {
			const newDate = currentDate.add({ years: 1 });
			value = newDate;
		}
	}
</script>

<CalendarPrimitive.Root
	bind:value
	bind:placeholder
	{weekdayFormat}
	class={cn("p-3", className)}
	{...$$restProps}
	on:keydown
	let:months
	let:weekdays
>
	<Calendar.Header>
		<div class="flex items-center justify-between w-full">
			<div class="flex items-center gap-1">
				<button
					class="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
					on:click={handlePrevYear}
				>
					<div class="flex">
						<ChevronLeft class="h-4 w-4" />
						<ChevronLeft class="h-4 w-4 -ml-2" />
					</div>
				</button>
				<Calendar.PrevButton />
			</div>
			<Calendar.Heading />
			<div class="flex items-center gap-1">
				<Calendar.NextButton />
				<button
					class="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
					on:click={handleNextYear}
				>
					<div class="flex">
						<ChevronRight class="h-4 w-4" />
						<ChevronRight class="h-4 w-4 -ml-2" />
					</div>
				</button>
			</div>
		</div>
	</Calendar.Header>
	<Calendar.Months>
		{#each months as month}
			<Calendar.Grid>
				<Calendar.GridHead>
					<Calendar.GridRow class="flex">
						{#each weekdays as weekday}
							<Calendar.HeadCell>
								{weekday.slice(0, 2)}
							</Calendar.HeadCell>
						{/each}
					</Calendar.GridRow>
				</Calendar.GridHead>
				<Calendar.GridBody>
					{#each month.weeks as weekDates}
						<Calendar.GridRow class="mt-2 w-full">
							{#each weekDates as date}
								<Calendar.Cell {date}>
									<Calendar.Day {date} month={month.value} />
								</Calendar.Cell>
							{/each}
						</Calendar.GridRow>
					{/each}
				</Calendar.GridBody>
			</Calendar.Grid>
		{/each}
	</Calendar.Months>
</CalendarPrimitive.Root>
