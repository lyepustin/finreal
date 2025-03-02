CREATE OR REPLACE FUNCTION get_bank_balances()
RETURNS TABLE (
    bank_id INTEGER,
    bank_name TEXT,
    total_balance NUMERIC,
    account_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id AS bank_id,
        b.name AS bank_name,
        COALESCE(SUM(tc.amount), 0) AS total_balance,
        COUNT(DISTINCT a.id) AS account_count
    FROM banks b
    LEFT JOIN accounts a ON a.bank_id = b.id
    LEFT JOIN transactions t ON t.account_id = a.id
    LEFT JOIN transaction_categories tc ON tc.transaction_id = t.id
    GROUP BY b.id, b.name
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql; 