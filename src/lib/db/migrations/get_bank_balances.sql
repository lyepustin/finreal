CREATE OR REPLACE FUNCTION get_bank_balances()
RETURNS TABLE (
    bank_id INTEGER,
    bank_name TEXT,
    balance NUMERIC,
    account_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH bank_summary AS (
        SELECT 
            b.id,
            CAST(b.name AS TEXT) as name,
            COUNT(DISTINCT a.id) as num_accounts,
            COALESCE(SUM(tc.amount), 0) as total_balance
        FROM banks b
        LEFT JOIN accounts a ON a.bank_id = b.id
        LEFT JOIN transactions t ON t.account_id = a.id
        LEFT JOIN transaction_categories tc ON tc.transaction_id = t.id
        GROUP BY b.id, b.name
    )
    SELECT
        bs.id as bank_id,
        CAST(bs.name AS TEXT) as bank_name,
        ROUND(bs.total_balance::NUMERIC, 2) as balance,
        bs.num_accounts as account_count
    FROM bank_summary bs
    ORDER BY bs.name;
END;
$$ LANGUAGE plpgsql; 