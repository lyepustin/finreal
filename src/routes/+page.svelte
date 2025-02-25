<script>
  // You can add any necessary imports here
</script>

<!-- Hero Section with Preline UI -->
<div class="bg-gradient-to-b from-violet-600/[.15] via-transparent">
  <div class="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
    <!-- Title -->
    <div class="max-w-3xl text-center mx-auto">
      <h1 class="block font-medium text-gray-800 text-4xl md:text-5xl lg:text-6xl dark:text-gray-200">
        Welcome to Finreal
      </h1>
    </div>
    <!-- End Title -->

    <div class="max-w-3xl text-center mx-auto">
      <p class="text-lg text-gray-600 dark:text-gray-400">Your personal finance management solution</p>
    </div>

    <!-- Buttons -->
    <div class="text-center">
      <div class="flex flex-col justify-center items-center gap-3 sm:flex-row sm:gap-4">
        <a class="inline-flex justify-center items-center gap-x-2 py-3 px-6 text-center bg-gradient-to-tl from-blue-600 to-violet-600 shadow-lg shadow-transparent hover:shadow-blue-700/50 border border-transparent text-white text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800" href="/transactions">
          Manage Transactions
          <svg class="flex-shrink-0 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </a>
        <a class="inline-flex justify-center items-center gap-x-2 py-3 px-6 text-center bg-white hover:bg-gray-100 border border-transparent text-sm text-blue-600 font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-blue-500 dark:focus:ring-offset-gray-800" href="/analytics">
          View Analytics
        </a>
      </div>
    </div>
    <!-- End Buttons -->
  </div>
</div>

<!-- Features Section -->
<div class="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 items-center gap-6 md:gap-10">
    <!-- Card -->
    <div class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]">
      <div class="h-52 flex flex-col justify-center items-center bg-blue-600 rounded-t-xl">
        <svg class="w-28 h-28 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
      </div>
      <div class="p-4 md:p-6">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          Track Expenses
        </h3>
        <p class="mt-3 text-gray-500">
          Easily record and categorize your daily expenses to keep track of your spending habits.
        </p>
      </div>
    </div>
    <!-- End Card -->

    <!-- Card -->
    <div class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]">
      <div class="h-52 flex flex-col justify-center items-center bg-violet-600 rounded-t-xl">
        <svg class="w-28 h-28 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="p-4 md:p-6">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          Budget Planning
        </h3>
        <p class="mt-3 text-gray-500">
          Create and manage budgets for different categories to help you stay on track with your financial goals.
        </p>
      </div>
    </div>
    <!-- End Card -->

    <!-- Card -->
    <div class="group flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-slate-900 dark:border-gray-700 dark:shadow-slate-700/[.7]">
      <div class="h-52 flex flex-col justify-center items-center bg-amber-500 rounded-t-xl">
        <svg class="w-28 h-28 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      </div>
      <div class="p-4 md:p-6">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          Insightful Analytics
        </h3>
        <p class="mt-3 text-gray-500">
          Visualize your financial data with charts and graphs to gain insights into your spending patterns.
        </p>
      </div>
    </div>
    <!-- End Card -->
  </div>
</div>

<!-- Footer -->
<footer class="mt-auto w-full max-w-[85rem] py-10 px-4 sm:px-6 lg:px-8 mx-auto">
  <div class="text-center">
    <div>
      <a class="flex-none text-xl font-semibold text-black dark:text-white" href="/" aria-label="Brand">Finreal</a>
    </div>
    <!-- End Col -->

    <div class="mt-3">
      <p class="text-gray-500">Visit <a class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400" href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
      <p class="text-gray-500 mt-2">
        <a class="inline-flex gap-x-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" href="/transactions">Transactions</a> |
        <a class="inline-flex gap-x-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" href="/analytics">Analytics</a>
      </p>
    </div>
  </div>
</footer>