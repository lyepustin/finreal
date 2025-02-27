<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  
  const { form } = $props<{ form: ActionData }>();
  
  let isSignUp = $state(false);
  
  function toggleAuthMode() {
    isSignUp = !isSignUp;
  }
</script>

<div class="min-h-screen bg-gradient-to-b from-violet-600/[.15] via-transparent dark:from-violet-900/[.15] dark:via-transparent flex flex-col lg:flex-row">
  <!-- Image Section (hidden on mobile) -->
  <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-purple-700/90 z-10"></div>
    <img 
      src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80" 
      alt="Finance background" 
      class="absolute inset-0 h-full w-full object-cover"
    />
    <div class="relative z-20 flex h-full items-center justify-center p-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-white mb-2">Financial Management Made Simple</h2>
        <p class="text-white/80 text-lg max-w-md mx-auto">
          Track your expenses, manage your investments, and plan your financial future all in one place.
        </p>
      </div>
    </div>
  </div>

  <!-- Form Section -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 mb-4">
          <svg class="size-8 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8V7c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2v-1"/>
            <path d="M14 8h7a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-7"/>
            <path d="M6 10v4"/>
            <path d="M10 10v4"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          {isSignUp ? 'Join us to start managing your finances' : 'Sign in to access your account'}
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
            <label for="email" class="block text-sm font-medium mb-2 dark:text-white">Email</label>
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
                class="py-3 px-4 ps-11 block w-full border-gray-200 rounded-lg text-sm focus:border-violet-500 focus:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:focus:ring-gray-600" 
                placeholder="name@example.com"
                required 
              >
            </div>
          </div>
          <!-- End Email Input -->

          <!-- Password Input -->
          <div class="mb-5">
            <label for="password" class="block text-sm font-medium mb-2 dark:text-white">Password</label>
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
                class="py-3 px-4 ps-11 block w-full border-gray-200 rounded-lg text-sm focus:border-violet-500 focus:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:focus:ring-gray-600" 
                placeholder={isSignUp ? "Create a password" : "Enter your password"}
                required 
              >
            </div>
          </div>
          <!-- End Password Input -->

          {#if !isSignUp}
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center">
                <div class="flex">
                  <input id="remember-me" name="remember-me" type="checkbox" class="shrink-0 mt-0.5 border-gray-200 rounded text-violet-600 focus:ring-violet-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-violet-500 dark:checked:border-violet-500 dark:focus:ring-offset-gray-800">
                  <label for="remember-me" class="ms-2 text-sm dark:text-white">Remember me</label>
                </div>
              </div>
              <div class="text-sm">
                <a class="text-violet-600 decoration-2 hover:underline font-medium dark:text-violet-400" href="/auth/reset-password">Forgot password?</a>
              </div>
            </div>
          {/if}

          <button 
            type="submit" 
            class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button 
                type="button" 
                class="text-violet-600 decoration-2 hover:underline font-medium dark:text-violet-400"
                onclick={toggleAuthMode}
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </form>
        <!-- End Form -->
      </div>
    </div>
  </div>
</div>

<style>

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

</style>