-- Drop existing function
DROP FUNCTION IF EXISTS get_financial_summary(text, integer, integer);

-- Create new function
CREATE OR REPLACE FUNCTION get_financial_summary(
    period_type TEXT DEFAULT 'month',
    num_periods INTEGER DEFAULT 5,
    period_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    period TEXT,
    income NUMERIC,
    expenses NUMERIC,
    net NUMERIC,
    categories JSONB
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

    IF period_offset < 0 THEN
        RAISE EXCEPTION 'period_offset must be non-negative';
    END IF;

    -- Calculate date range
    IF period_type = 'month' THEN
        -- For monthly data, end date is the last day of the current month minus offset months
        end_date := DATE_TRUNC('month', CURRENT_DATE - (period_offset || ' months')::INTERVAL) + INTERVAL '1 month' - INTERVAL '1 day';
        -- Start from the first day of the month num_periods months before end_date
        start_date := DATE_TRUNC('month', end_date - ((num_periods - 1) || ' months')::INTERVAL);
        interval_step := '1 month'::INTERVAL;
    ELSE
        -- For yearly data, end date is the last day of the current year minus offset years
        end_date := DATE_TRUNC('year', CURRENT_DATE - (period_offset || ' years')::INTERVAL) + INTERVAL '1 year' - INTERVAL '1 day';
        -- Start from the first day of the year num_periods years before end_date
        start_date := DATE_TRUNC('year', end_date - ((num_periods - 1) || ' years')::INTERVAL);
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
    transactions_with_totals AS (
        -- Calculate income and expenses at the transaction level
        SELECT
            CASE 
                WHEN period_type = 'month' THEN 
                    TO_CHAR(t.operation_date, 'Mon YYYY')
                ELSE 
                    TO_CHAR(t.operation_date, 'YYYY')
            END as period_label,
            c.id as category_id,
            c.name as category_name,
            tc.amount,
            CASE WHEN tc.amount > 0 THEN tc.amount ELSE 0 END as income_amount,
            CASE WHEN tc.amount < 0 THEN ABS(tc.amount) ELSE 0 END as expense_amount
        FROM transactions t
        JOIN transaction_categories tc ON tc.transaction_id = t.id
        JOIN categories c ON c.id = tc.category_id
        WHERE t.operation_date BETWEEN start_date AND end_date
        AND LOWER(c.name) != 'transfers ♻️'
    ),
    transactions_by_category AS (
        -- Aggregate by category within each period
        SELECT
            period_label,
            category_id,
            category_name,
            SUM(amount) as total_amount,
            SUM(income_amount) as category_income,
            SUM(expense_amount) as category_expenses
        FROM transactions_with_totals
        GROUP BY 
            period_label,
            category_id,
            category_name
    ),
    transactions_summary AS (
        SELECT
            period_label,
            SUM(category_income) as total_income,
            SUM(category_expenses) as total_expenses,
            SUM(total_amount) as net_amount,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', category_id::TEXT,
                    'name', REGEXP_REPLACE(category_name, '\s+\S+$', ''), -- Remove the last word (emoji)
                    'amount', total_amount,
                    'emoji', SUBSTRING(category_name FROM '\s*(\S+)$') -- Get the last word (emoji)
                )
            ) as categories
        FROM transactions_by_category
        GROUP BY period_label
    )
    SELECT
        p.period_label as period,
        ROUND(COALESCE(ts.total_income, 0)::NUMERIC, 2) as income,
        ROUND(COALESCE(ts.total_expenses, 0)::NUMERIC, 2) as expenses,
        ROUND(COALESCE(ts.net_amount, 0)::NUMERIC, 2) as net,
        COALESCE(ts.categories, '[]'::JSONB) as categories
    FROM periods p
    LEFT JOIN transactions_summary ts ON ts.period_label = p.period_label
    ORDER BY p.period_start
    LIMIT num_periods;
END;
$$ LANGUAGE plpgsql; 