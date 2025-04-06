<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	type $$Props = HTMLAttributes<HTMLDivElement>;

	let className: $$Props["class"] = undefined;
	export { className as class };
</script>

<div
	class={cn("mt-4 flex flex-col gap-8 md:flex-row md:gap-4 md:space-y-0", className)}
	{...$$restProps}
>
	<slot />
</div>
