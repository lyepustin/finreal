import { createServerClient } from '@supabase/ssr'
import { type Handle, redirect } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const supabase: Handle = async ({ event, resolve }) => {
  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      /**
       * SvelteKit's cookies API requires `path` to be explicitly set in
       * the cookie options. Setting `path` to `/` replicates previous/
       * standard behavior.
       */
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { 
            ...options, 
            path: '/',
            secure: process.env.NODE_ENV === 'production' // Only require secure in production
          })
        })
      },
    },
  })

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()

    // If we're signing out, clear all auth cookies
    if (event.url.pathname === '/auth/signout' && event.request.method === 'POST') {
      const cookies = event.cookies.getAll()
      cookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          event.cookies.delete(cookie.name, { path: '/' })
        }
      })
      return { session: null, user: null }
    }

    if (!session) {
      return { session: null, user: null }
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()
    if (error) {
      // JWT validation has failed
      return { session: null, user: null }
    }

    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  const isApiRoute = event.url.pathname.startsWith('/api/')
  const isAuthRoute = event.url.pathname.startsWith('/auth/') || event.url.pathname === '/auth'
  const isSignOutRoute = event.url.pathname === '/auth/signout'

  // Allow sign-out requests to proceed
  if (isSignOutRoute && event.request.method === 'POST') {
    return resolve(event)
  }

  // Handle unauthenticated requests
  if (!event.locals.session && !isAuthRoute) {
    if (isApiRoute) {
      // Return 401 for API routes
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    // Redirect to auth page for regular routes
    throw redirect(303, '/auth')
  }

  // Redirect authenticated users away from auth page, but allow confirmation
  if (event.locals.session && isAuthRoute && !event.url.pathname.includes('/auth/confirm')) {
    throw redirect(303, '/')
  }

  return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard)