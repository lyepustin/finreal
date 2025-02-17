import { redirect, fail } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return fail(400, {
        error: error.message,
        email
      })
    }

    return {
      success: true,
      message: 'Please check your email for a confirmation link.'
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return fail(400, {
        error: error.message,
        email
      })
    }

    throw redirect(303, '/private')
  },
}