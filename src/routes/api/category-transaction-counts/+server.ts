import { json } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .rpc('get_category_transaction_counts');

        if (error) {
            console.error('Error fetching category transaction counts:', error);
            return json({ 
                counts: [], 
                error: 'Failed to fetch category transaction counts' 
            }, { status: 500 });
        }

        // Transform the data into a more usable format
        const categoryMap = new Map();

        data.forEach(item => {
            if (!categoryMap.has(item.category_id)) {
                categoryMap.set(item.category_id, {
                    id: item.category_id,
                    name: item.category_name,
                    transactionCount: item.category_transaction_count || 0,
                    subcategories: new Map()
                });
            }

            const category = categoryMap.get(item.category_id);

            // Add subcategory counts if it exists
            if (item.subcategory_id) {
                category.subcategories.set(item.subcategory_id, {
                    id: item.subcategory_id,
                    name: item.subcategory_name,
                    transactionCount: item.subcategory_transaction_count || 0
                });
            }
        });

        // Convert the Maps to arrays for JSON serialization
        const categories = Array.from(categoryMap.values()).map(category => ({
            ...category,
            subcategories: Array.from(category.subcategories.values())
        }));

        return json({ categories });

    } catch (error) {
        console.error('Error in category transaction counts:', error);
        return json({ 
            counts: [], 
            error: 'Internal server error' 
        }, { status: 500 });
    }
} 