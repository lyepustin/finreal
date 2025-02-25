<script>
  import { page } from '$app/stores';
  
  function goBack() {
    history.back();
  }
</script>

<div class="max-w-[50rem] mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
  <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 dark:bg-slate-900 dark:border-gray-700">
    <div class="text-center">
      <div class="flex justify-center mb-4">
        <svg class="flex-shrink-0 size-10 text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      
      <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">Error {$page.status}</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">{$page.error?.message || 'Something went wrong'}</p>
      
      <div class="mt-6">
        <a href="/" class="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
          Return to home
        </a>
        
        <button 
          class="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600 ml-2"
          onclick={goBack}
        >
          Go back
        </button>
      </div>
    </div>
  </div>
</div> 