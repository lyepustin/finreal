import { supabase } from '$lib/db/supabase'
import type { Rule } from '$lib/types'

async function getRules() {
    console.log('Fetching rules from Supabase...');
    const query = supabase
        .from('transaction_rules')
        .select(`
            *,
            category:categories(
                id,
                name,
                subcategories(id, name)
            ),
            subcategory:subcategories(
                id,
                name
            )
        `)
        .order('id');
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching rules:', error);
        throw new Error(`Failed to fetch rules: ${error.message}`);
    }

    return data as Rule[];
}

async function upsertRule(rule: Partial<Rule>) {
    const { data, error } = await supabase
        .from('transaction_rules')
        .upsert({
            id: rule.id || undefined,
            pattern: rule.pattern,
            category_id: rule.category_id,
            subcategory_id: rule.subcategory_id
        })
        .select(`
            *,
            category:categories(
                id,
                name,
                subcategories(id, name)
            ),
            subcategory:subcategories(
                id,
                name
            )
        `)
        .single();

    if (error) {
        console.error('Error upserting rule:', error);
        throw new Error('Failed to save rule');
    }

    return data as Rule;
}

async function deleteRule(id: number) {
    const { error } = await supabase
        .from('transaction_rules')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting rule:', error);
        throw new Error('Failed to delete rule');
    }
}

export const rules = {
    getRules,
    upsertRule,
    deleteRule
}; 