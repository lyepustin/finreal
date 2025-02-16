import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    // First, get only the count for pagination
    const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error fetching count:', countError);
        return json({ transactions: [], totalPages: 0, currentPage: 1 }, { status: 500 });
    }

    // Then, get only the needed fields for the current page
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
            id,
            uuid,
            operation_date,
            value_date,
            description,
            user_description,
            account:accounts!inner (
                id,
                bank_id,
                account_type,
                account_number,
                bank:banks!inner (
                    id,
                    name
                )
            ),
            categories:transaction_categories!inner (
                id,
                transaction_id,
                category_id,
                subcategory_id,
                amount,
                category:categories!inner (
                    id,
                    name
                ),
                subcategory:subcategories (
                    id,
                    category_id,
                    name
                )
            )
        `)
        .order('operation_date', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) {
        console.error('Error fetching transactions:', error);
        return json({ transactions: [], totalPages: 0, currentPage: 1 }, { status: 500 });
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return json({
        transactions,
        totalPages,
        currentPage: page
    });
};

export const PATCH: RequestHandler = async ({ params, request, locals: { supabase } }) => {
    const { user_description } = await request.json();
    const id = params.id;

    const { error } = await supabase
        .from('transactions')
        .update({ user_description })
        .eq('id', id);

    if (error) {
        console.error('Error updating transaction:', error);
        return json({ error: 'Failed to update transaction' }, { status: 500 });
    }

    return json({ success: true });
}; 