CREATE OR REPLACE FUNCTION get_category_transaction_counts()
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    subcategory_id INTEGER,
    subcategory_name TEXT,
    category_transaction_count BIGINT,
    subcategory_transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH category_counts AS (
        -- Get direct category transaction counts (where no subcategory is specified)
        SELECT 
            c.id as cat_id,
            c.name as cat_name,
            COUNT(tc.transaction_id) as category_count
        FROM categories c
        LEFT JOIN transaction_categories tc ON tc.category_id = c.id AND tc.subcategory_id IS NULL
        GROUP BY c.id, c.name
    ),
    subcategory_counts AS (
        -- Get subcategory transaction counts
        SELECT 
            c.id as cat_id,
            c.name as cat_name,
            sc.id as subcat_id,
            sc.name as subcat_name,
            COUNT(tc.transaction_id) as subcategory_count
        FROM categories c
        LEFT JOIN subcategories sc ON sc.category_id = c.id
        LEFT JOIN transaction_categories tc ON tc.subcategory_id = sc.id
        GROUP BY c.id, c.name, sc.id, sc.name
    )
    SELECT
        cc.cat_id as category_id,
        CAST(cc.cat_name AS TEXT) as category_name,
        sc.subcat_id as subcategory_id,
        CAST(sc.subcat_name AS TEXT) as subcategory_name,
        cc.category_count as category_transaction_count,
        sc.subcategory_count as subcategory_transaction_count
    FROM category_counts cc
    LEFT JOIN subcategory_counts sc ON sc.cat_id = cc.cat_id
    ORDER BY cc.cat_name, sc.subcat_name;
END;
$$ LANGUAGE plpgsql; 