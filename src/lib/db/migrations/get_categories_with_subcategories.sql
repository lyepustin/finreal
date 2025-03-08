CREATE OR REPLACE FUNCTION get_categories_with_subcategories()
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(50),
    subcategories JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', s.id,
                    'category_id', s.category_id,
                    'name', s.name
                )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
        ) as subcategories
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql; 