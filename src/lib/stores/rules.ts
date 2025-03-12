import type { Rule } from '$lib/types'

async function getRules() {
    const response = await fetch('/api/rules');
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Error fetching rules:', error);
        throw new Error(`Failed to fetch rules: ${error}`);
    }

    const data = await response.json();
    return data as Rule[];
}

async function upsertRule(rule: Partial<Rule>) {
    const response = await fetch('/api/rules', {
        method: rule.id ? 'PUT' : 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule)
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Error upserting rule:', error);
        throw new Error('Failed to save rule');
    }

    const data = await response.json();
    return data as Rule;
}

async function deleteRule(id: number) {
    const response = await fetch(`/api/rules/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Error deleting rule:', error);
        throw new Error('Failed to delete rule');
    }
}

export const rules = {
    getRules,
    upsertRule,
    deleteRule
}; 