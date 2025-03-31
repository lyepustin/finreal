-- Make sure the gin extension is enabled for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on operation_date which is frequently used in filters
-- (Keep only one version - both were identical)
CREATE INDEX IF NOT EXISTS idx_transactions_operation_date ON transactions(operation_date);

-- Indexes for transaction_categories
-- (Replace separate indexes with the composite one, which is more efficient)
CREATE INDEX IF NOT EXISTS idx_transaction_categories_composite
ON transaction_categories (transaction_id, category_id, amount);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm 
ON transactions USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transactions_user_description_trgm 
ON transactions USING gin (user_description gin_trgm_ops);