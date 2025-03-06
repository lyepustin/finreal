import { rules } from '$lib/stores/rules';
import { error, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { supabase } from '$lib/db/supabase';

export const load = async () => {
    try {
        const [rulesList, { data: categories, error: categoriesError }] = await Promise.all([
            rules.getRules(),
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

        if (categoriesError) {
            throw new Error('Failed to fetch categories');
        }

        return { rules: rulesList, categories };
    } catch (e) {
        throw error(500, 'Failed to load rules data');
    }
};

export const actions: Actions = {
    upsertRule: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');
        const pattern = formData.get('pattern');
        const category_id = formData.get('category_id');
        const subcategory_id = formData.get('subcategory_id');

        if (!pattern || !category_id) {
            return fail(400, {
                error: { message: 'Pattern and category are required' }
            });
        }

        try {
            await rules.upsertRule({
                id: id ? Number(id) : undefined,
                pattern: pattern.toString(),
                category_id: Number(category_id),
                subcategory_id: subcategory_id ? Number(subcategory_id) : null
            });

            return { rules: await rules.getRules() };
        } catch (e) {
            return fail(500, {
                error: { message: 'Failed to save rule' }
            });
        }
    },

    deleteRule: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (!id) {
            return fail(400, {
                error: { message: 'Rule ID is required' }
            });
        }

        try {
            await rules.deleteRule(Number(id));
            return { rules: await rules.getRules() };
        } catch (e) {
            return fail(500, {
                error: { message: 'Failed to delete rule' }
            });
        }
    }
}; 