import { error, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

// Helper function to get the full rules query
const getRulesQuery = (supabase) => {
    return supabase
        .from('transaction_rules')
        .select(`
            id,
            pattern,
            category_id,
            subcategory_id,
            category:categories(
                id, 
                name, 
                subcategories:subcategories(id, name)
            ),
            subcategory:subcategories(id, name)
        `)
        .order('id');
};

export const load = async ({ locals: { supabase } }) => {
    try {
        const [{ data: rules, error: rulesError }, { data: categories, error: categoriesError }] = await Promise.all([
            getRulesQuery(supabase),
            supabase
                .from('categories')
                .select(`
                    id,
                    name,
                    subcategories (
                        id,
                        name
                    )
                `)
                .order('name')
        ]);

        if (rulesError) throw new Error('Failed to fetch rules');
        if (categoriesError) throw new Error('Failed to fetch categories');

        return { rules, categories };
    } catch (e) {
        console.error('Error loading data:', e);
        throw error(500, 'Failed to load rules data');
    }
};

export const actions: Actions = {
    createRule: async ({ request, locals: { supabase } }) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return fail(401, {
                error: { message: 'Unauthorized' }
            });
        }

        const formData = await request.formData();
        const pattern = formData.get('pattern');
        const category_id = formData.get('category_id');
        const subcategory_id = formData.get('subcategory_id');

        if (!pattern || !category_id) {
            return fail(400, {
                error: { message: 'Pattern and category are required' }
            });
        }

        try {
            // Create new rule
            const { error: createError } = await supabase
                .from('transaction_rules')
                .insert({
                    pattern: pattern.toString(),
                    category_id: Number(category_id),
                    subcategory_id: subcategory_id ? Number(subcategory_id) : null,
                    user_id: session.user.id
                });

            if (createError) throw createError;

            // Fetch updated rules list
            const { data: rules, error: rulesError } = await getRulesQuery(supabase);
            if (rulesError) throw rulesError;

            return { rules };
        } catch (err) {
            console.error('Error creating rule:', err);
            return fail(500, {
                error: { message: 'Failed to create rule' }
            });
        }
    },

    upsertRule: async ({ request, locals: { supabase } }) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return fail(401, {
                error: { message: 'Unauthorized' }
            });
        }

        const formData = await request.formData();
        const id = formData.get('id');
        const pattern = formData.get('pattern');
        const category_id = formData.get('category_id');
        const subcategory_id = formData.get('subcategory_id');

        if (!id || !pattern || !category_id) {
            return fail(400, {
                error: { message: 'ID, pattern, and category are required for updates' }
            });
        }

        try {
            // Update existing rule
            const { error: updateError } = await supabase
                .from('transaction_rules')
                .update({
                    pattern: pattern.toString(),
                    category_id: Number(category_id),
                    subcategory_id: subcategory_id ? Number(subcategory_id) : null,
                    user_id: session.user.id
                })
                .eq('id', Number(id));

            if (updateError) throw updateError;

            // Fetch updated rules list
            const { data: rules, error: rulesError } = await getRulesQuery(supabase);
            if (rulesError) throw rulesError;

            return { rules };
        } catch (err) {
            console.error('Error updating rule:', err);
            return fail(500, {
                error: { message: 'Failed to update rule' }
            });
        }
    },

    deleteRule: async ({ request, locals: { supabase } }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (!id) {
            return fail(400, {
                error: { message: 'Rule ID is required' }
            });
        }

        try {
            const { error: deleteError } = await supabase
                .from('transaction_rules')
                .delete()
                .eq('id', Number(id));

            if (deleteError) throw deleteError;

            // Fetch updated rules list with relationships
            const { data: rules, error: rulesError } = await getRulesQuery(supabase);

            if (rulesError) throw rulesError;

            return { rules };
        } catch (err) {
            console.error('Error deleting rule:', err);
            return fail(500, {
                error: { message: 'Failed to delete rule' }
            });
        }
    },

    applyRule: async ({ request, locals: { supabase } }) => {
        const formData = await request.formData();
        const ruleId = formData.get('id');

        if (!ruleId) {
            return fail(400, { error: { message: 'Rule ID is required' } });
        }

        try {
            // Call the apply_rule function
            const { data: rpcResult, error: dbError } = await supabase
                .rpc('apply_rule', { rule_id: parseInt(ruleId.toString()) });

            if (dbError) throw dbError;

            // Get updated rules list with relationships
            const { data: rules, error: rulesError } = await getRulesQuery(supabase);

            if (rulesError) throw rulesError;

            // Extract affected_count directly from the first result
            const affectedCount = rpcResult?.[0]?.affected_count;

            return {
                rules,
                affectedCount
            };
        } catch (err) {
            console.error('Error applying rule:', err);
            return fail(500, {
                error: { message: 'Failed to apply rule' }
            });
        }
    }
}; 