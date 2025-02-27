<script lang="ts">
    // This page will redirect immediately, but we'll show a loading state just in case
    import { onMount } from 'svelte';
    
    let isLoading = true;
    
    onMount(() => {
      // Keep loading state for a short time to show the loading animation
      setTimeout(() => {
        isLoading = false;
      }, 1000);
    });
</script>

<div class="max-w-md mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[50vh]">
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center dark:bg-slate-900 dark:border-gray-700 w-full">
        {#if isLoading}
            <div class="flex justify-center">
                <div class="animate-spin inline-block size-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">Signing you out...</p>
        {:else}
            <div class="flex justify-center mb-4">
                <svg class="flex-shrink-0 size-10 text-green-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white">Successfully signed out</h2>
            <p class="mt-2 text-gray-600 dark:text-gray-400">You have been successfully signed out of your account.</p>
            <div class="mt-6">
                <a href="/" class="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
                    Return to home
                </a>
            </div>
        {/if}
    </div>
</div> 