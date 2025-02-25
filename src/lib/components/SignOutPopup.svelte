<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { enhance } from '$app/forms';
  
  const { isOpen } = $props<{ isOpen: boolean }>();
  let isLoading = $state(false);
  
  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
  
  function handleCancel() {
    if (!isLoading) {
      dispatch('cancel');
    }
  }
  
  function handleSubmit() {
    return ({ update, result }) => {
      isLoading = true;
      
      // Handle different result types
      if (result.type === 'error') {
        console.error('Sign-out error:', result.error);
        // Don't update the page on error - let the error page handle it
        update({ reset: false });
      } else if (result.type === 'redirect') {
        // Let the redirect happen naturally
        dispatch('confirm');
      } else {
        // For success or other cases, update the form
        update();
        dispatch('confirm');
      }
      
      // Reset loading state after a timeout in case the redirect doesn't happen
      setTimeout(() => {
        if (isLoading) {
          isLoading = false;
          dispatch('cancel');
        }
      }, 3000);
    };
  }
</script>

{#if isOpen}
  <!-- Overlay -->
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick={handleCancel}></div>
      
      <!-- Modal panel -->
      <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800">
        <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 dark:bg-gray-800">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10 dark:bg-red-900/20">
              <svg class="h-6 w-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white" id="modal-title">Sign out</h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to sign out? You will need to sign in again to access your account.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700">
          <form 
            method="POST" 
            action="/auth/signout?/signout"
            use:enhance={handleSubmit}
            class="inline-flex"
          >
            <button 
              type="submit"
              class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-70"
              disabled={isLoading}
            >
              {#if isLoading}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing out...
              {:else}
                Sign out
              {/if}
            </button>
          </form>
          <button 
            type="button" 
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700"
            onclick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 