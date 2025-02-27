import { redirect, type ServerLoad } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals: { supabase } }) => {
  // Sign out the user
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error.message);
  }
  
  // Redirect to the home page after sign-out
  throw redirect(303, '/');
};

export const actions: Actions = {
  signout: async ({ locals: { supabase } }) => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Return a redirect instead of JSON
    throw redirect(303, '/');
  }
}; 