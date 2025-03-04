-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_category_totals;

-- Create new function
CREATE OR REPLACE FUNCTION get_category_totals(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    type_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    total_amount NUMERIC,
    subcategories JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_transactions AS (
        SELECT 
            t.id as transaction_id,
            tc.amount,
            tc.category_id,
            tc.subcategory_id,
            c.name as category_name,
            s.name as subcategory_name
        FROM transactions t
        INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
        INNER JOIN categories c ON c.id = tc.category_id
        LEFT JOIN subcategories s ON s.id = tc.subcategory_id
        WHERE 
            -- Date range filter
            (date_from IS NULL OR t.operation_date >= date_from) AND
            (date_to IS NULL OR t.operation_date <= date_to) AND
            -- Type filter
            (
                type_filter = 'all' OR
                (type_filter = 'income' AND tc.amount > 0) OR
                (type_filter = 'expense' AND tc.amount < 0)
            )
    ),
    category_totals AS (
        SELECT 
            ft.category_id,
            MAX(ft.category_name) as category_name,
            SUM(ft.amount) as total_amount
        FROM filtered_transactions ft
        GROUP BY ft.category_id
        HAVING SUM(ft.amount) != 0
    ),
    subcategory_totals AS (
        SELECT 
            ft.category_id,
            ft.subcategory_id,
            ft.subcategory_name,
            COUNT(DISTINCT ft.transaction_id) as transaction_count,
            SUM(ft.amount) as total_amount
        FROM filtered_transactions ft
        WHERE ft.subcategory_id IS NOT NULL
        GROUP BY ft.category_id, ft.subcategory_id, ft.subcategory_name
    )
    SELECT 
        ct.category_id,
        ct.category_name,
        ct.total_amount::NUMERIC(20,2) as total_amount,
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', st.subcategory_id,
                    'name', st.subcategory_name,
                    'amount', st.total_amount::NUMERIC(20,2),
                    'transactionCount', st.transaction_count
                )
            ) FILTER (WHERE st.subcategory_id IS NOT NULL),
            '[]'::JSONB
        ) as subcategories
    FROM category_totals ct
    LEFT JOIN subcategory_totals st ON ct.category_id = st.category_id
    GROUP BY ct.category_id, ct.category_name, ct.total_amount
    ORDER BY ABS(ct.total_amount) DESC;
END;
$$ LANGUAGE plpgsql; 