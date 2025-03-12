-- Start a transaction block
BEGIN;

-- First, delete the transaction categories for 2025 transactions
DELETE FROM transaction_categories
WHERE transaction_id IN (
    SELECT id 
    FROM transactions 
    WHERE EXTRACT(YEAR FROM operation_date) = 2025
);

-- Then, delete the transactions from 2025
DELETE FROM transactions 
WHERE EXTRACT(YEAR FROM operation_date) = 2025;

-- Commit the transaction
COMMIT; 