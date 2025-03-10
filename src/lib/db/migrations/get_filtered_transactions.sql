-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_filtered_transactions;

-- Create new function
CREATE OR REPLACE FUNCTION get_filtered_transactions(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    type_filter TEXT DEFAULT 'all',
    category_ids INTEGER[] DEFAULT NULL,
    is_negative BOOLEAN DEFAULT FALSE,
    sort_column TEXT DEFAULT 'date',
    sort_direction TEXT DEFAULT 'desc',
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 30,
    search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_count BIGINT,
    transactions JSONB
) AS $$
DECLARE
    offset_val INTEGER;
    filtered_results JSONB;
BEGIN
    -- Log input parameters
    RAISE NOTICE 'Search parameters: date_from=%, date_to=%, type_filter=%, search_term=%', 
        date_from, date_to, type_filter, search_term;

    -- Calculate offset
    offset_val := (page_number - 1) * page_size;

    -- Get filtered transactions
    WITH filtered_transactions AS (
        SELECT 
            t.id,
            t.uuid,
            t.operation_date,
            t.value_date,
            t.description,
            t.user_description,
            t.inserted_at,
            t.account_id,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', tc.id,
                    'transaction_id', tc.transaction_id,
                    'category_id', tc.category_id,
                    'subcategory_id', tc.subcategory_id,
                    'amount', tc.amount,
                    'category', JSONB_BUILD_OBJECT(
                        'id', c.id,
                        'name', c.name
                    ),
                    'subcategory', CASE 
                        WHEN s.id IS NOT NULL THEN 
                            JSONB_BUILD_OBJECT(
                                'id', s.id,
                                'name', s.name
                            )
                        ELSE NULL 
                    END
                )
            ) as categories,
            JSONB_BUILD_OBJECT(
                'id', a.id,
                'bank_id', a.bank_id,
                'account_type', a.account_type,
                'account_number', a.account_number,
                'bank', JSONB_BUILD_OBJECT(
                    'id', b.id,
                    'name', b.name
                )
            ) as account,
            SUM(tc.amount) as total_amount
        FROM transactions t
        INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
        INNER JOIN categories c ON c.id = tc.category_id
        LEFT JOIN subcategories s ON s.id = tc.subcategory_id
        INNER JOIN accounts a ON a.id = t.account_id
        INNER JOIN banks b ON b.id = a.bank_id
        WHERE 
            -- Date range filter
            (date_from IS NULL OR t.operation_date >= date_from) AND
            (date_to IS NULL OR t.operation_date <= date_to) AND
            -- Category filter with is_negative handling
            (
                category_ids IS NULL OR
                CASE 
                    WHEN is_negative THEN NOT (tc.category_id = ANY(category_ids))
                    ELSE tc.category_id = ANY(category_ids)
                END
            ) AND
            -- Type filter
            (
                type_filter = 'all' OR
                (type_filter = 'income' AND tc.amount > 0) OR
                (type_filter = 'expense' AND tc.amount < 0)
            ) AND
            -- Search filter
            (
                search_term IS NULL OR
                LOWER(t.description) ILIKE LOWER('%' || search_term || '%') OR
                LOWER(COALESCE(t.user_description, '')) ILIKE LOWER('%' || search_term || '%')
            )
        GROUP BY t.id, t.uuid, t.operation_date, t.value_date, t.description, t.user_description, t.inserted_at, t.account_id, a.id, a.bank_id, a.account_type, a.account_number, b.id, b.name
    )
    SELECT 
        COUNT(*) OVER()::BIGINT as total_count,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', ft.id,
                'uuid', ft.uuid,
                'operation_date', ft.operation_date,
                'value_date', ft.value_date,
                'description', ft.description,
                'user_description', ft.user_description,
                'inserted_at', ft.inserted_at,
                'account_id', ft.account_id,
                'categories', ft.categories,
                'account', ft.account
            )
            ORDER BY 
                CASE 
                    WHEN sort_column = 'date' AND sort_direction = 'asc' THEN ft.operation_date
                    ELSE NULL
                END ASC NULLS LAST,
                CASE 
                    WHEN sort_column = 'date' AND sort_direction = 'desc' THEN ft.operation_date
                    ELSE NULL
                END DESC NULLS LAST,
                CASE 
                    WHEN sort_column = 'amount' AND sort_direction = 'asc' THEN ABS(ft.total_amount)
                    ELSE NULL
                END ASC NULLS LAST,
                CASE 
                    WHEN sort_column = 'amount' AND sort_direction = 'desc' THEN ABS(ft.total_amount)
                    ELSE NULL
                END DESC NULLS LAST,
                CASE 
                    WHEN sort_column = 'description' AND sort_direction = 'asc' THEN COALESCE(ft.user_description, ft.description)
                    ELSE NULL
                END ASC NULLS LAST,
                CASE 
                    WHEN sort_column = 'description' AND sort_direction = 'desc' THEN COALESCE(ft.user_description, ft.description)
                    ELSE NULL
                END DESC NULLS LAST,
                ft.operation_date DESC -- Default sort
        ) as transactions
    INTO total_count, filtered_results
    FROM filtered_transactions ft
    LIMIT page_size
    OFFSET offset_val;

    -- Log results
    RAISE NOTICE 'Found % total records', total_count;

    RETURN QUERY SELECT total_count, COALESCE(filtered_results, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql; 