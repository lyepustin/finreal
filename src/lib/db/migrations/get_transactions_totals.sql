-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_transactions_totals;

-- Create new function
CREATE OR REPLACE FUNCTION get_transactions_totals(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    type_filter TEXT DEFAULT 'all',
    category_ids INTEGER[] DEFAULT NULL,
    is_negative BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_amount NUMERIC
) AS $$
BEGIN
    -- Log input parameters
    RAISE NOTICE 'Input parameters: date_from=%, date_to=%, type_filter=%, category_ids=%, is_negative=%',
        date_from, date_to, type_filter, category_ids, is_negative;

    RETURN QUERY
    WITH filtered_transactions AS (
        SELECT 
            t.id,
            tc.amount,
            tc.category_id
        FROM transactions t
        INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
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
            )
    )
    SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::NUMERIC(20,2) as total_income,
        COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0)::NUMERIC(20,2) as total_expenses,
        COALESCE(SUM(amount), 0)::NUMERIC(20,2) as net_amount
    FROM filtered_transactions;
END;
$$ LANGUAGE plpgsql; 