-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_transactions_totals;

-- Create new function
CREATE OR REPLACE FUNCTION get_transactions_totals(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    type_filter TEXT DEFAULT 'all',
    category_ids INTEGER[] DEFAULT NULL,
    is_negative BOOLEAN DEFAULT FALSE,
    search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_amount NUMERIC
) AS $$
BEGIN
    -- Log input parameters
    RAISE NOTICE 'Input parameters: date_from=%, date_to=%, type_filter=%, category_ids=%, is_negative=%, search_term=%',
        date_from, date_to, type_filter, category_ids, is_negative, search_term;

    RETURN QUERY
    WITH base_transactions AS (
        SELECT 
            t.id,
            t.description,
            t.user_description,
            t.operation_date
        FROM transactions t
        WHERE 
            -- Date range filter
            (date_from IS NULL OR t.operation_date >= date_from) AND
            (date_to IS NULL OR t.operation_date <= date_to) AND
            -- Search filter
            (
                search_term IS NULL OR
                LOWER(t.description) ILIKE LOWER('%' || search_term || '%') OR
                LOWER(COALESCE(t.user_description, '')) ILIKE LOWER('%' || search_term || '%')
            )
    ),
    filtered_transactions AS (
        SELECT 
            tc.amount
        FROM base_transactions t
        INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
        WHERE 
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
            )
    )
    SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::NUMERIC(20,2) as total_income,
        COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0)::NUMERIC(20,2) as total_expenses,
        COALESCE(SUM(amount), 0)::NUMERIC(20,2) as net_amount
    FROM filtered_transactions;
END;
$$ LANGUAGE plpgsql; 