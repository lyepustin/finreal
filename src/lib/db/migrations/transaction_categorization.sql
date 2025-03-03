-- Function to categorize a transaction based on rules
CREATE OR REPLACE FUNCTION public.categorize_transaction()
RETURNS TRIGGER AS $$
DECLARE
    matching_rule RECORD;
    transaction_desc TEXT;
BEGIN
    -- Get the transaction description
    SELECT description INTO transaction_desc
    FROM public.transactions 
    WHERE id = NEW.transaction_id;

    -- Find matching rule based on the transaction description
    SELECT tr.* INTO matching_rule
    FROM public.transaction_rules tr
    WHERE transaction_desc ILIKE '%' || tr.pattern || '%'
    LIMIT 1;

    IF FOUND THEN
        -- Update with the matching rule
        NEW.category_id := matching_rule.category_id;
        NEW.subcategory_id := matching_rule.subcategory_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS categorize_transaction_trigger ON public.transactions;
DROP TRIGGER IF EXISTS categorize_transaction_trigger ON public.transaction_categories;

-- Create trigger to automatically categorize transactions on insert
CREATE TRIGGER categorize_transaction_trigger
    BEFORE INSERT ON public.transaction_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.categorize_transaction(); 