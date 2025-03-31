CREATE OR REPLACE FUNCTION get_filtered_transactions_count(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    type_filter TEXT DEFAULT 'all',
    category_ids INTEGER[] DEFAULT NULL,
    is_negative BOOLEAN DEFAULT FALSE,
    search_term TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    count_result BIGINT;
BEGIN
    -- Count query only
    SELECT COUNT(DISTINCT t.id)
    INTO count_result
    FROM transactions t
    INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
    WHERE 
        (date_from IS NULL OR t.operation_date >= date_from) AND
        (date_to IS NULL OR t.operation_date <= date_to) AND
        (category_ids IS NULL OR
            CASE 
                WHEN is_negative THEN NOT (tc.category_id = ANY(category_ids))
                ELSE tc.category_id = ANY(category_ids)
            END
        ) AND
        (
            type_filter = 'all' OR
            (type_filter = 'income' AND tc.amount > 0) OR
            (type_filter = 'expense' AND tc.amount < 0)
        ) AND
        (
            search_term IS NULL OR
            LOWER(t.description) ILIKE LOWER('%' || search_term || '%') OR
            LOWER(COALESCE(t.user_description, '')) ILIKE LOWER('%' || search_term || '%')
        );
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_filtered_transactions_data(
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
RETURNS JSONB AS $$
DECLARE
    offset_val INTEGER;
    result_data JSONB;
BEGIN
    -- Calculate offset
    offset_val := (page_number - 1) * page_size;

    -- Get transaction IDs with sorting
    WITH transaction_amounts AS (
        SELECT 
            t.id,
            t.operation_date,
            COALESCE(t.user_description, t.description) as display_description,
            SUM(tc.amount) as total_amount
        FROM transactions t
        INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
        WHERE 
            (date_from IS NULL OR t.operation_date >= date_from) AND
            (date_to IS NULL OR t.operation_date <= date_to) AND
            (category_ids IS NULL OR
                CASE 
                    WHEN is_negative THEN NOT (tc.category_id = ANY(category_ids))
                    ELSE tc.category_id = ANY(category_ids)
                END
            ) AND
            (
                type_filter = 'all' OR
                (type_filter = 'income' AND tc.amount > 0) OR
                (type_filter = 'expense' AND tc.amount < 0)
            ) AND
            (
                search_term IS NULL OR
                LOWER(t.description) ILIKE LOWER('%' || search_term || '%') OR
                LOWER(COALESCE(t.user_description, '')) ILIKE LOWER('%' || search_term || '%')
            )
        GROUP BY t.id, t.operation_date, display_description
    ),
    sorted_transactions AS (
        SELECT 
            ta.id
        FROM transaction_amounts ta
        ORDER BY 
            CASE WHEN sort_column = 'date' AND sort_direction = 'asc' THEN ta.operation_date END ASC,
            CASE WHEN sort_column = 'date' AND sort_direction = 'desc' THEN ta.operation_date END DESC,
            CASE WHEN sort_column = 'amount' AND sort_direction = 'asc' THEN ABS(ta.total_amount) END ASC,
            CASE WHEN sort_column = 'amount' AND sort_direction = 'desc' THEN ABS(ta.total_amount) END DESC,
            CASE WHEN sort_column = 'description' AND sort_direction = 'asc' THEN ta.display_description END ASC,
            CASE WHEN sort_column = 'description' AND sort_direction = 'desc' THEN ta.display_description END DESC,
            ta.operation_date DESC
        LIMIT page_size
        OFFSET offset_val
    )
    -- Then build the JSON for just those IDs
    SELECT 
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', t.id,
                'uuid', t.uuid,
                'operation_date', t.operation_date,
                'value_date', t.value_date,
                'description', t.description,
                'user_description', t.user_description,
                'inserted_at', t.inserted_at,
                'account_id', t.account_id,
                'categories', (
                    SELECT JSONB_AGG(
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
                    )
                    FROM transaction_categories tc
                    INNER JOIN categories c ON c.id = tc.category_id
                    LEFT JOIN subcategories s ON s.id = tc.subcategory_id
                    WHERE tc.transaction_id = t.id
                ),
                'account', JSONB_BUILD_OBJECT(
                    'id', a.id,
                    'bank_id', a.bank_id,
                    'account_type', a.account_type,
                    'account_number', a.account_number,
                    'bank', JSONB_BUILD_OBJECT(
                        'id', b.id,
                        'name', b.name
                    )
                )
            )
        ) 
    INTO result_data
    FROM sorted_transactions st
    JOIN transactions t ON t.id = st.id
    JOIN accounts a ON a.id = t.account_id
    JOIN banks b ON b.id = a.bank_id;
    
    RETURN COALESCE(result_data, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;


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
    count_val BIGINT;
    trans_data JSONB;
BEGIN
    -- Get count
    count_val := get_filtered_transactions_count(
        date_from, date_to, type_filter, category_ids, 
        is_negative, search_term
    );
    
    -- Get data
    trans_data := get_filtered_transactions_data(
        date_from, date_to, type_filter, category_ids, 
        is_negative, sort_column, sort_direction,
        page_number, page_size, search_term
    );
    
    RETURN QUERY SELECT count_val, trans_data;
END;
$$ LANGUAGE plpgsql;