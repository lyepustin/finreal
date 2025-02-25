<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const { currentPage, totalPages } = $props<{ 
        currentPage: number;
        totalPages: number;
    }>();

    const dispatch = createEventDispatcher<{
        pageChange: { page: number };
    }>();

    function handlePageChange(page: number) {
        // Validate page number
        if (page < 1 || page > totalPages) {
            return;
        }
        
        dispatch('pageChange', { page });
    }

    const pageNumbers = $derived(Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const pageNum = currentPage <= 3 
            ? i + 1 
            : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i;
        return pageNum <= totalPages ? pageNum : null;
    }).filter(Boolean));
</script>

<div class="flex justify-center items-center space-x-2 mt-6">
    <nav class="flex items-center gap-x-1">
        <button 
            type="button" 
            class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            onclick={() => handlePageChange(1)}
            disabled={currentPage === 1}
        >
            <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
            <span class="sr-only">First</span>
        </button>
        <button 
            type="button" 
            class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            onclick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
        >
            <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <span class="sr-only">Previous</span>
        </button>
        
        <!-- Page numbers -->
        {#each pageNumbers as pageNum}
            <button 
                type="button" 
                class="min-h-[38px] min-w-[38px] flex justify-center items-center text-gray-800 hover:bg-gray-100 py-2 px-3 text-sm rounded-lg focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
                class:bg-blue-500={pageNum === currentPage}
                class:text-white={pageNum === currentPage}
                class:dark:bg-blue-500={pageNum === currentPage}
                onclick={() => handlePageChange(pageNum)}
            >
                {pageNum}
            </button>
        {/each}
        
        <button 
            type="button" 
            class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            onclick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
        >
            <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span class="sr-only">Next</span>
        </button>
        <button 
            type="button" 
            class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            onclick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
        >
            <svg class="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>
            <span class="sr-only">Last</span>
        </button>
    </nav>
</div> 