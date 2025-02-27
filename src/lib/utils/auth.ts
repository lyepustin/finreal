/**
 * Signs out the user using the API endpoint
 * @returns A promise that resolves when the sign-out is complete
 */
import { enhance } from '$app/forms';

export async function signOut() {
  try {
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signout?/signout';
    form.style.display = 'none';
    
    // Add it to the document
    document.body.appendChild(form);
    
    // Create a custom enhance handler
    const enhanceHandler = (form: HTMLFormElement) => {
      // Apply the enhance function to the form
      // We don't need to store the returned object
      enhance(form, () => {
        return async ({ update, result }) => {
          // Handle different result types
          if (result.type === 'error') {
            console.error('Sign-out error:', result.error);
            // Don't update the page on error - let the error page handle it
            update({ reset: false });
          } else if (result.type === 'redirect') {
            // Let the redirect happen naturally
          } else {
            // For success or other cases, update the form
            update();
          }
        };
      });
    };
    
    // Apply the enhance handler to the form
    enhanceHandler(form);
    
    // Submit the form
    form.submit();
    
    // The form submission will cause a redirect, so we don't need to do anything else
    return { success: true };
  } catch (error) {
    console.error('Failed to sign out:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 