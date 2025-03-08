<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const { isOpen, searchTerm = '' } = $props<{
        isOpen: boolean;
        searchTerm?: string;
    }>();

    const dispatch = createEventDispatcher<{
        close: void;
        apply: { searchTerm: string };
    }>();

    let searchInput = $state(searchTerm);

    function handleClose() {
        dispatch('close');
    }

    function handleSubmit(e: Event) {
        e.preventDefault();
        dispatch('apply', { searchTerm: searchInput.trim() });
    }

    function handleClear() {
        searchInput = '';
        dispatch('apply', { searchTerm: '' });
        handleClose();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
        }
    }

    // Reset search input when modal opens
    $effect(() => {
        if (isOpen) {
            searchInput = searchTerm;
        }
    });
</script>

{#if isOpen}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="search-modal-title"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={handleClose}
        onkeydown={handleKeyDown}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-full sm:w-[500px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="search-modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Search Transactions
            </h2>
            <button
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={handleClose}
                aria-label="Close search"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <form 
            class="p-4 sm:p-6"
            onsubmit={handleSubmit}
        >
            <div class="mb-6">
                <label for="search" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Search in transaction descriptions
                </label>
                <input
                    type="text"
                    id="search"
                    bind:value={searchInput}
                    class="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-600 dark:text-white dark:focus:border-blue-500"
                    placeholder="Enter search term..."
                />
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Search will look in both original and user descriptions
                </p>
            </div>

            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                    type="button"
                    class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-slate-800 dark:border-gray-600 dark:hover:bg-slate-700"
                    onclick={handleClose}
                >
                    Cancel
                </button>
                {#if searchInput}
                    <button
                        type="button"
                        class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/40"
                        onclick={handleClear}
                    >
                        Clear Search
                    </button>
                {/if}
                <button
                    type="submit"
                    class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500"
                >
                    Search
                </button>
            </div>
        </form>
    </div>
</div>
{/if} 