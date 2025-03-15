import { redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ locals: { supabase }, cookies }) => {
    try {
      // First, sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error.message);
        return {
          success: false,
          error: error.message
        };
      }

      // Clear all Supabase-related cookies
      const authCookies = cookies.getAll();
      authCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          cookies.delete(cookie.name, { path: '/' });
        }
      });

      // Force expire the session cookie
      cookies.set('sb-access-token', '', {
        path: '/',
        expires: new Date(0)
      });
      cookies.set('sb-refresh-token', '', {
        path: '/',
        expires: new Date(0)
      });

      // Redirect to auth page
      throw redirect(303, '/auth');
    } catch (err) {
      console.error('Error during sign out:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      };
    }
  }
}; 