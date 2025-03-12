-- Create a function to handle the entire transaction update in one atomic operation
CREATE OR REPLACE FUNCTION update_transaction_categories(
    p_transaction_id INTEGER,
    p_categories JSONB
) RETURNS VOID AS $$
BEGIN
    -- Delete existing categories
    DELETE FROM transaction_categories
    WHERE transaction_id = p_transaction_id;

    -- Insert new categories
    INSERT INTO transaction_categories (
        transaction_id,
        category_id,
        subcategory_id,
        amount
    )
    SELECT 
        p_transaction_id,
        (value->>'categoryId')::INTEGER,
        NULLIF((value->>'subcategoryId')::INTEGER, 0),
        (value->>'amount')::NUMERIC
    FROM jsonb_array_elements(p_categories);
END;
$$ LANGUAGE plpgsql; 