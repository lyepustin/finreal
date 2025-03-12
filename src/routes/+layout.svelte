<script>
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
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
	  try {
	    await signOut();
	    // The form submission will handle the redirect
	  } catch (error) {
	    console.error('Failed to sign out:', error);
	  }
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

	// Function to check if a path is active
	function isActive(path) {
		return $page.url.pathname === path;
	}
  
	onMount(() => {
	  const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
		if (event === 'SIGNED_OUT') {
		  await invalidate('supabase:auth');
		} else if (newSession?.expires_at !== session?.expires_at) {
		  await invalidate('supabase:auth');
		}
	  })

	  // Initialize Preline UI
	  import('preline/preline').then(({ HSStaticMethods }) => {
		HSStaticMethods.autoInit();
	  });
  
	  return () => data.subscription.unsubscribe()
	})
</script>

<svelte:head>
  <title>ꜰɪɴʀᴇᴀʟ</title>
  <meta name="description" content="Personal finance management made simple. Track expenses, manage categories, and automate transaction rules.">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content={$page.url.href}>
  <meta property="og:title" content="ꜰɪɴʀᴇᴀʟ - Personal Finance Management">
  <meta property="og:description" content="Personal finance management made simple. Track expenses, manage categories, and automate transaction rules.">
  <meta property="og:image" content={`${$page.url.origin}/og-image.png`}>

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content={$page.url.href}>
  <meta property="twitter:title" content="ꜰɪɴʀᴇᴀʟ - Personal Finance Management">
  <meta property="twitter:description" content="Personal finance management made simple. Track expenses, manage categories, and automate transaction rules.">
  <meta property="twitter:image" content={`${$page.url.origin}/og-image.png`}>

  <!-- Favicon configuration -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#2563eb">
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2563eb">
  <meta name="msapplication-TileColor" content="#2563eb">
</svelte:head>

<!-- Header with mobile-friendly navigation -->
<header class="hidden sm:flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white border-b border-gray-200 text-sm py-3 sm:py-0 dark:bg-gray-800 dark:border-gray-700">
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
        <a class="font-medium {isActive('/') ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-500'} sm:py-6" href="/" onclick={collapseMenu} aria-current={isActive('/') ? 'page' : undefined}>Home</a>
        <a class="font-medium {isActive('/transactions') ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-500'} sm:py-6" href="/transactions" onclick={collapseMenu} aria-current={isActive('/transactions') ? 'page' : undefined}>Transactions</a>
        <a class="font-medium {isActive('/manage/categories') ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-500'} sm:py-6" href="/manage/categories" onclick={collapseMenu} aria-current={isActive('/manage/categories') ? 'page' : undefined}>Categories</a>
        <a class="font-medium {isActive('/manage/rules') ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-500'} sm:py-6" href="/manage/rules" onclick={collapseMenu} aria-current={isActive('/manage/rules') ? 'page' : undefined}>Rules</a>
        
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

<!-- Mobile Bottom Navigation -->
<nav class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 sm:hidden dark:bg-gray-800 dark:border-gray-700 z-50">
  <div class="flex justify-around items-center h-16">
    <a href="/" class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span class="text-xs mt-1">Home</span>
    </a>
    <a href="/transactions" class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs mt-1">Transactions</span>
    </a>
    <a href="/manage/categories" class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
      </svg>
      <span class="text-xs mt-1">Categories</span>
    </a>
    <a href="/manage/rules" class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
      <span class="text-xs mt-1">Rules</span>
    </a>
    {#if session}
      <button 
        class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
        onclick={handleDirectSignOut}
      >
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        </svg>
        <span class="text-xs mt-1">Sign out</span>
      </button>
    {:else}
      <a href="/auth" class="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        </svg>
        <span class="text-xs mt-1">Sign in</span>
      </a>
    {/if}
  </div>
</nav>

<!-- Sign Out Popup - Only shown when using the popup flow -->
{#if showSignOutPopup}
  <SignOutPopup 
    isOpen={showSignOutPopup} 
    on:confirm={handleSignOutConfirm} 
    on:cancel={closeSignOutPopup} 
  />
{/if}

<!-- Main content with bottom padding for mobile -->
<main class="container mx-auto px-4 py-2 sm:py-8 mb-16 sm:mb-8">
  {@render children()}
</main>

<!-- Footer -->
<footer class="mt-auto w-full max-w-[85rem] py-10 px-4 sm:px-6 lg:px-8 mx-auto hidden sm:block">
  <div class="text-center">
    <div>
      <a class="flex-none text-xl font-semibold text-black dark:text-white" href="/" aria-label="Brand">Finreal</a>
    </div>
    <div class="mt-3">
      <p class="text-gray-500">© {new Date().getFullYear()} Finreal. All rights reserved.</p>
    </div>
  </div>
</footer>