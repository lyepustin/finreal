<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  
  const { form } = $props<{ form: ActionData }>();
  
  let isSignUp = $state(false);
  
  function toggleAuthMode() {
    isSignUp = !isSignUp;
  }
</script>

<div class="min-h-screen bg-gradient-to-b from-[#ccb7a4]/[.15] via-transparent dark:from-[#ccb7a4]/[.25] dark:via-transparent flex flex-col lg:flex-row">
  <!-- Image Section (visible on all devices) -->
  <div class="lg:w-1/2 relative overflow-hidden p-4 lg:p-0">
    <div class="absolute inset-0 bg-gradient-to-r from-[#ccb7a4]/40 to-[#a89482]/40 z-10 rounded-2xl lg:rounded-none"></div>
    <img 
      src="/vaskia-cot.jpg" 
      alt="Wet cat after bath" 
      class="absolute inset-0 h-full w-full object-cover object-center rounded-2xl lg:rounded-none"
    />
    <div class="relative z-20 flex h-full items-center justify-center p-8 min-h-[300px] lg:min-h-0">
      <div class="text-center">
        <h2 class="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">Don't Let Your Finances Get as Messy as a Wet Cat!</h2>
        <p class="text-white/90 text-lg max-w-md mx-auto">
          {isSignUp 
            ? "Join now, because nobody wants to look as grumpy as this wet cat when checking their bank account!" 
            : "Welcome back! Looking better than a wet cat already!"}
        </p>
      </div>
    </div>
  </div>

  <!-- Form Section -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-r from-[#ccb7a4] to-[#a89482] mb-4">
          <svg class="size-8 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8V7c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2v-1"/>
            <path d="M14 8h7a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-7"/>
            <path d="M6 10v4"/>
            <path d="M10 10v4"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {isSignUp ? 'Stay Dry, Stay Rich!' : 'Welcome Back, Human!'}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          {isSignUp ? 'Create your account to avoid the wet cat syndrome' : 'Your finances are looking purrfect today'}
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
        <!-- Form -->
        <form method="POST" action={isSignUp ? "?/signup" : "?/login"} use:enhance>
          {#if form?.error}
            <div class="bg-red-50 border border-red-200 text-sm text-red-600 rounded-xl p-4 mb-6 dark:bg-red-800/10 dark:border-red-900/30 dark:text-red-500" role="alert">
              <div class="flex items-center gap-2">
                <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {form.error}
              </div>
            </div>
          {/if}
          
          {#if form?.message}
            <div class="bg-green-50 border border-green-200 text-sm text-green-600 rounded-xl p-4 mb-6 dark:bg-green-800/10 dark:border-green-900/30 dark:text-green-500" role="alert">
              <div class="flex items-center gap-2">
                <svg class="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {form.message}
              </div>
            </div>
          {/if}

          <!-- Email Input -->
          <div class="mb-5">
            <label for="email" class="block text-sm font-medium mb-2 dark:text-white">Your Human Email</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                <svg class="size-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={form?.email ?? ''} 
                class="py-3 px-4 ps-11 block w-full border-gray-200 rounded-lg text-sm focus:border-[#ccb7a4] focus:ring-[#ccb7a4] disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:focus:ring-gray-600" 
                placeholder="your.dry.self@example.com"
                required 
              >
            </div>
          </div>

          <!-- Password Input -->
          <div class="mb-5">
            <label for="password" class="block text-sm font-medium mb-2 dark:text-white">Secret Paw-ssword</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                <svg class="size-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input 
                type="password" 
                id="password" 
                name="password" 
                class="py-3 px-4 ps-11 block w-full border-gray-200 rounded-lg text-sm focus:border-[#ccb7a4] focus:ring-[#ccb7a4] disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:focus:ring-gray-600" 
                placeholder={isSignUp ? "Make it stronger than wet cat smell" : "Your secret whiskers"}
                required 
              >
            </div>
          </div>

          {#if !isSignUp}
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center">
                <div class="flex">
                  <input id="remember-me" name="remember-me" type="checkbox" class="shrink-0 mt-0.5 border-gray-200 rounded text-[#ccb7a4] focus:ring-[#ccb7a4] dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-[#ccb7a4] dark:checked:border-[#ccb7a4] dark:focus:ring-offset-gray-800">
                  <label for="remember-me" class="ms-2 text-sm dark:text-white">Remember my nine lives</label>
                </div>
              </div>
              <div class="text-sm">
                <a class="text-[#a89482] decoration-2 hover:underline font-medium dark:text-[#ccb7a4]" href="/auth/reset-password">Lost your whiskers?</a>
              </div>
            </div>
          {/if}

          <button 
            type="submit" 
            class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-gradient-to-r from-[#ccb7a4] to-[#a89482] text-white hover:from-[#bea693] hover:to-[#97856f] disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
          >
            {isSignUp ? '🐱 Start Your Dry Journey' : '🐱 Time to Get Financially Fluffy'}
          </button>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already a dry cat?' : "Still a wet cat?"}
              <button 
                type="button" 
                class="text-[#a89482] decoration-2 hover:underline font-medium dark:text-[#ccb7a4]"
                onclick={toggleAuthMode}
              >
                {isSignUp ? 'Sign in here' : 'Get dried up here'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<style>
  /* Remove the old button styles as they're now handled by Tailwind classes */
</style>