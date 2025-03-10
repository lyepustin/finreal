-- First, remove any existing constraints
ALTER TABLE transaction_categories 
DROP CONSTRAINT IF EXISTS transaction_categories_transaction_id_key,
DROP CONSTRAINT IF EXISTS transaction_categories_unique_assignment;

-- Then add a composite unique constraint to prevent duplicate category assignments
-- This ensures we can have multiple categories per transaction, but not the same category-subcategory combination
ALTER TABLE transaction_categories
ADD CONSTRAINT transaction_categories_unique_assignment 
UNIQUE (transaction_id, category_id, subcategory_id)
DEFERRABLE INITIALLY DEFERRED;