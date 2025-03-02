CREATE OR REPLACE FUNCTION get_financial_summary(
    period_type TEXT DEFAULT 'month',
    num_periods INTEGER DEFAULT 5
)
RETURNS TABLE (
    period TEXT,
    income NUMERIC,
    expenses NUMERIC,
    net NUMERIC
) AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    interval_step INTERVAL;
BEGIN
    -- Input validation
    IF period_type NOT IN ('month', 'year') THEN
        RAISE EXCEPTION 'Invalid period_type. Must be either "month" or "year"';
    END IF;

    -- Calculate date range
    end_date := CURRENT_DATE;
    
    IF period_type = 'month' THEN
        -- For monthly data, start from the first day of the month num_periods months ago
        start_date := DATE_TRUNC('month', CURRENT_DATE - (num_periods - 1 || ' months')::INTERVAL);
        interval_step := '1 month'::INTERVAL;
    ELSE
        -- For yearly data, start from the first day of the year num_periods years ago
        start_date := DATE_TRUNC('year', CURRENT_DATE - (num_periods - 1 || ' years')::INTERVAL);
        interval_step := '1 year'::INTERVAL;
    END IF;

    -- Generate series of periods
    RETURN QUERY
    WITH RECURSIVE periods AS (
        SELECT
            CASE 
                WHEN period_type = 'month' THEN 
                    TO_CHAR(date_series, 'Mon YYYY')
                ELSE 
                    TO_CHAR(date_series, 'YYYY')
            END as period_label,
            DATE_TRUNC(period_type, date_series) as period_start,
            DATE_TRUNC(period_type, date_series + interval_step) - INTERVAL '1 day' as period_end
        FROM generate_series(start_date, end_date, interval_step) as date_series
    ),
    transactions_summary AS (
        SELECT
            CASE 
                WHEN period_type = 'month' THEN 
                    TO_CHAR(t.operation_date, 'Mon YYYY')
                ELSE 
                    TO_CHAR(t.operation_date, 'YYYY')
            END as period_label,
            COALESCE(SUM(CASE WHEN tc.amount > 0 THEN tc.amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN tc.amount < 0 THEN ABS(tc.amount) ELSE 0 END), 0) as total_expenses,
            COALESCE(SUM(tc.amount), 0) as net_amount
        FROM transactions t
        JOIN transaction_categories tc ON tc.transaction_id = t.id
        WHERE t.operation_date BETWEEN start_date AND end_date
        AND tc.category_id NOT IN (
            SELECT id FROM public.categories 
            WHERE LOWER(name) = 'transfers ♻️'
        )
        GROUP BY period_label
    )
    SELECT
        p.period_label as period,
        ROUND(COALESCE(ts.total_income, 0)::NUMERIC, 2) as income,
        ROUND(COALESCE(ts.total_expenses, 0)::NUMERIC, 2) as expenses,
        ROUND(COALESCE(ts.net_amount, 0)::NUMERIC, 2) as net
    FROM periods p
    LEFT JOIN transactions_summary ts ON ts.period_label = p.period_label
    ORDER BY p.period_start
    LIMIT num_periods;
END;
$$ LANGUAGE plpgsql; 