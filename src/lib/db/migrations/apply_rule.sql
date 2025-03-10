-- Function to apply a rule to existing transactions
CREATE OR REPLACE FUNCTION public.apply_rule(rule_id INTEGER)
RETURNS TABLE (affected_count INTEGER) AS $$
DECLARE
    rule_record RECORD;
    affected INTEGER;
BEGIN
    -- Get the rule details
    SELECT * INTO rule_record
    FROM public.transaction_rules
    WHERE id = rule_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INTEGER;
        RETURN;
    END IF;

    -- Simply update or insert categories for matching transactions
    WITH upsert_result AS (
        INSERT INTO public.transaction_categories (
            transaction_id,
            category_id,
            subcategory_id,
            amount
        )
        SELECT 
            t.id,
            rule_record.category_id,
            rule_record.subcategory_id,
            tc.amount
        FROM public.transactions t
        LEFT JOIN public.transaction_categories tc ON t.id = tc.transaction_id
        WHERE t.description ILIKE '%' || rule_record.pattern || '%'
        ON CONFLICT (transaction_id) 
        DO UPDATE SET
            category_id = rule_record.category_id,
            subcategory_id = rule_record.subcategory_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO affected FROM upsert_result;

    -- Return the actual number of affected rows
    RETURN QUERY SELECT affected;
END;
$$ LANGUAGE plpgsql;