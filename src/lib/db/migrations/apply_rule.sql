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
        RAISE NOTICE 'Rule with ID % not found', rule_id;
        RETURN QUERY SELECT 0::INTEGER;
        RETURN;
    END IF;

    RAISE NOTICE 'Applying rule: pattern=%, category_id=%, subcategory_id=%', 
        rule_record.pattern, rule_record.category_id, rule_record.subcategory_id;

    -- Update existing transaction categories where transaction description matches
    WITH matching_transactions AS (
        SELECT t.id
        FROM public.transactions t
        WHERE t.description ILIKE '%' || rule_record.pattern || '%'
        OR t.user_description ILIKE '%' || rule_record.pattern || '%'
    ),
    update_result AS (
        UPDATE public.transaction_categories tc
        SET 
            category_id = rule_record.category_id,
            subcategory_id = rule_record.subcategory_id
        FROM matching_transactions mt
        WHERE tc.transaction_id = mt.id
        RETURNING 1
    )
    SELECT COUNT(*) INTO affected FROM update_result;

    RAISE NOTICE 'Rule application complete. Affected rows: %', affected;

    -- Return the actual number of affected rows
    RETURN QUERY SELECT affected;
END;
$$ LANGUAGE plpgsql;