import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
    depends('supabase:transactions')

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
            *,
            account:accounts (
                *,
                bank:banks (*)
            ),
            categories:transaction_categories (
                *,
                category:categories (*),
                subcategory:subcategories (*)
            )
        `)
        .order('operation_date', { ascending: false })

    if (error) {
        console.error('Error fetching transactions:', error)
        return { transactions: [] }
    }

    return { transactions: transactions ?? [] }
} 