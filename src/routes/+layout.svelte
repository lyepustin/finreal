<script>
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import '../app.css'; // Make sure Tailwind CSS is imported
	import SignOutPopup from '$lib/components/SignOutPopup.svelte';
	import { signOut } from '$lib/utils/auth';
  
	let { data, children } = $props()
	let { session, supabase } = $derived(data)
	
	let showSignOutPopup = $state(false);
	
	function openSignOutPopup() {
	  showSignOutPopup = true;
	  collapseMenu();
	}
	
	function closeSignOutPopup() {
	  showSignOutPopup = false;
	}
	
	function handleSignOutConfirm() {
	  // The form in SignOutPopup will handle the actual sign-out
	  // We just need to close the popup when it's done
	  closeSignOutPopup();
	}
	
	// Direct sign-out function using the utility
	async function handleDirectSignOut() {
	  collapseMenu();
	  await signOut();
	}
	
	// Function to collapse the mobile menu
	function collapseMenu() {
	  // Only run on mobile
	  if (window.innerWidth < 640) { // sm breakpoint is 640px
	    const collapseElement = document.getElementById('navbar-collapse-with-animation');
	    if (collapseElement && !collapseElement.classList.contains('hidden')) {
	      // Find the toggle button and click it to collapse the menu
	      const toggleButton = document.querySelector('.hs-collapse-toggle');
	      if (toggleButton) {
	        toggleButton.click();
	      }
	    }
	  }
	}
  
	onMount(() => {
	  const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
		if (newSession?.expires_at !== session?.expires_at) {
		  invalidate('supabase:auth')
		}
	  })

	  // Initialize Preline UI
	  import('preline/preline').then(({ HSStaticMethods }) => {
		HSStaticMethods.autoInit();
	  });
  
	  return () => data.subscription.unsubscribe()
	})
</script>

<!-- Header with mobile-friendly navigation -->
<header class="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white border-b border-gray-200 text-sm py-3 sm:py-0 dark:bg-gray-800 dark:border-gray-700">
  <nav class="relative max-w-[85rem] w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="Global">
    <div class="flex items-center justify-between">
      <a class="flex-none text-xl font-semibold dark:text-white" href="/" aria-label="Brand">Finreal</a>
      <div class="sm:hidden">
        <button type="button" class="hs-collapse-toggle size-9 flex justify-center items-center text-sm font-semibold rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600" data-hs-collapse="#navbar-collapse-with-animation" aria-controls="navbar-collapse-with-animation" aria-label="Toggle navigation">
          <svg class="hs-collapse-open:hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          <svg class="hs-collapse-open:block hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div id="navbar-collapse-with-animation" class="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow sm:block">
      <div class="flex flex-col gap-y-4 gap-x-0 mt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-y-0 sm:gap-x-7 sm:mt-0 sm:ps-7">
        <a class="font-medium text-blue-600 sm:py-6 dark:text-blue-500" href="/" onclick={collapseMenu} aria-current="page">Home</a>
        <a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6 dark:text-gray-400 dark:hover:text-gray-500" href="/transactions" onclick={collapseMenu}>Transactions</a>
        <a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6 dark:text-gray-400 dark:hover:text-gray-500" href="/analytics" onclick={collapseMenu}>Analytics</a>
		<a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6 dark:text-gray-400 dark:hover:text-gray-500" href="/categories" onclick={collapseMenu}>Categories</a>
        
        {#if session}
          <button 
            class="flex items-center gap-x-2 font-medium text-gray-500 hover:text-blue-600 sm:border-s sm:border-gray-300 sm:my-6 sm:ps-6 dark:border-gray-700 dark:text-gray-400 dark:hover:text-blue-500"
            onclick={handleDirectSignOut}
          >
            <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Sign out
          </button>
        {:else}
          <a class="flex items-center gap-x-2 font-medium text-gray-500 hover:text-blue-600 sm:border-s sm:border-gray-300 sm:my-6 sm:ps-6 dark:border-gray-700 dark:text-gray-400 dark:hover:text-blue-500" href="/auth" onclick={collapseMenu}>
            <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Sign in
          </a>
        {/if}
      </div>
    </div>
  </nav>
</header>

<!-- Sign Out Popup - Only shown when using the popup flow -->
{#if showSignOutPopup}
  <SignOutPopup 
    isOpen={showSignOutPopup} 
    on:confirm={handleSignOutConfirm} 
    on:cancel={closeSignOutPopup} 
  />
{/if}

<!-- Main content -->
<main class="container mx-auto px-4 py-8">
  {@render children()}
</main>

<!-- Footer -->
<footer class="mt-auto w-full max-w-[85rem] py-10 px-4 sm:px-6 lg:px-8 mx-auto">
  <div class="text-center">
    <div>
      <a class="flex-none text-xl font-semibold text-black dark:text-white" href="/" aria-label="Brand">Finreal</a>
    </div>
    <div class="mt-3">
      <p class="text-gray-500">© 2023 Finreal. All rights reserved.</p>
    </div>
  </div>
</footer>