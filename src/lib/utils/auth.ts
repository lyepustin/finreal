/**
 * Signs out the user using the API endpoint
 * @returns A promise that resolves when the sign-out is complete
 */
import type { Load } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { enhance } from '$app/forms';
import { invalidate } from '$app/navigation';

export async function signOut() {
  try {
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signout';

    // Add it to the document
    document.body.appendChild(form);

    // Use enhance to handle the form submission
    enhance(form, () => {
      return async ({ result }) => {
        // Invalidate all data
        await invalidate('supabase:auth');

        if (result.type === 'redirect') {
          window.location.href = result.location;
        }
      };
    });

    // Submit the form
    form.submit();
    document.body.removeChild(form);

    return { success: true };
  } catch (error) {
    console.error('Failed to sign out:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export const protectPage: Load = async ({ parent }) => {
    const { session } = await parent();
    
    if (!session) {
        throw redirect(303, '/auth');
    }

    return { session };
} 