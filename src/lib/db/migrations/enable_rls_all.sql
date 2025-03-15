-- Enable RLS and set up user access for all tables
-- Order: direct user ownership tables first, then dependent tables

-- =====================
-- Banks (base table with direct user ownership)
-- =====================
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Add user_id to banks
ALTER TABLE banks
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing banks to belong to the specified user
UPDATE banks
SET user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE banks
ALTER COLUMN user_id SET NOT NULL;

-- Create policies for banks
DROP POLICY IF EXISTS "Users can view their own banks" ON banks;
CREATE POLICY "Users can view their own banks"
ON banks
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own banks" ON banks;
CREATE POLICY "Users can insert their own banks"
ON banks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own banks" ON banks;
CREATE POLICY "Users can update their own banks"
ON banks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own banks" ON banks;
CREATE POLICY "Users can delete their own banks"
ON banks
FOR DELETE
USING (auth.uid() = user_id);

-- =====================
-- Categories (base table with direct user ownership)
-- =====================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Add user_id to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing categories to belong to the specified user
UPDATE categories
SET user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE categories
ALTER COLUMN user_id SET NOT NULL;

-- Create policies for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories"
ON categories
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
CREATE POLICY "Users can insert their own categories"
ON categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories"
ON categories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories"
ON categories
FOR DELETE
USING (auth.uid() = user_id);

-- =====================
-- Transaction Rules (base table with direct user ownership)
-- =====================
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

-- Add user_id to transaction_rules
ALTER TABLE transaction_rules
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing rules to belong to the specified user
UPDATE transaction_rules
SET user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE transaction_rules
ALTER COLUMN user_id SET NOT NULL;

-- Create policies for transaction_rules
DROP POLICY IF EXISTS "Users can view their own rules" ON transaction_rules;
CREATE POLICY "Users can view their own rules"
ON transaction_rules
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rules" ON transaction_rules;
CREATE POLICY "Users can insert their own rules"
ON transaction_rules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rules" ON transaction_rules;
CREATE POLICY "Users can update their own rules"
ON transaction_rules
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rules" ON transaction_rules;
CREATE POLICY "Users can delete their own rules"
ON transaction_rules
FOR DELETE
USING (auth.uid() = user_id);

-- =====================
-- Accounts (depends on banks)
-- =====================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Add user_id to accounts through bank relationship
UPDATE accounts a
SET bank_id = (
    SELECT b.id 
    FROM banks b 
    WHERE b.user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
    LIMIT 1
)
WHERE bank_id IS NULL;

-- Make bank_id NOT NULL if it isn't already
ALTER TABLE accounts
ALTER COLUMN bank_id SET NOT NULL;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can only access their own accounts" ON accounts;

-- Create policy to check user_id through bank relationship
CREATE POLICY "Users can only access their own accounts"
ON accounts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM banks
        WHERE banks.id = accounts.bank_id
        AND banks.user_id = auth.uid()
    )
);

-- =====================
-- Subcategories (depends on categories)
-- =====================
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Update subcategories to link to valid categories
UPDATE subcategories s
SET category_id = (
    SELECT c.id 
    FROM categories c 
    WHERE c.user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
    LIMIT 1
)
WHERE category_id IS NULL;

-- Make category_id NOT NULL if it isn't already
ALTER TABLE subcategories
ALTER COLUMN category_id SET NOT NULL;

-- Create policies for subcategories
DROP POLICY IF EXISTS "Users can view their own subcategories" ON subcategories;
CREATE POLICY "Users can view their own subcategories"
ON subcategories
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM categories
        WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their own subcategories" ON subcategories;
CREATE POLICY "Users can insert their own subcategories"
ON subcategories
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM categories
        WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own subcategories" ON subcategories;
CREATE POLICY "Users can update their own subcategories"
ON subcategories
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM categories
        WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM categories
        WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their own subcategories" ON subcategories;
CREATE POLICY "Users can delete their own subcategories"
ON subcategories
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM categories
        WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
);

-- =====================
-- Transactions (depends on accounts)
-- =====================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Update transactions to link to valid accounts
UPDATE transactions t
SET account_id = (
    SELECT a.id 
    FROM accounts a
    JOIN banks b ON b.id = a.bank_id
    WHERE b.user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
    LIMIT 1
)
WHERE account_id IS NULL;

-- Make account_id NOT NULL if it isn't already
ALTER TABLE transactions
ALTER COLUMN account_id SET NOT NULL;

-- Create policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = transactions.account_id 
        AND EXISTS (
            SELECT 1 FROM banks
            WHERE banks.id = accounts.bank_id
            AND banks.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions"
ON transactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = transactions.account_id 
        AND EXISTS (
            SELECT 1 FROM banks
            WHERE banks.id = accounts.bank_id
            AND banks.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions"
ON transactions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = transactions.account_id 
        AND EXISTS (
            SELECT 1 FROM banks
            WHERE banks.id = accounts.bank_id
            AND banks.user_id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = transactions.account_id 
        AND EXISTS (
            SELECT 1 FROM banks
            WHERE banks.id = accounts.bank_id
            AND banks.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions"
ON transactions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = transactions.account_id 
        AND EXISTS (
            SELECT 1 FROM banks
            WHERE banks.id = accounts.bank_id
            AND banks.user_id = auth.uid()
        )
    )
);

-- =====================
-- Transaction Categories (depends on transactions and accounts)
-- =====================
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- Update transaction_categories to link to valid transactions
UPDATE transaction_categories tc
SET transaction_id = (
    SELECT t.id 
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    JOIN banks b ON b.id = a.bank_id
    WHERE b.user_id = '393aaccd-3c02-496e-9551-3f3d0c5b58b8'
    LIMIT 1
)
WHERE transaction_id IS NULL;

-- Make transaction_id NOT NULL if it isn't already
ALTER TABLE transaction_categories
ALTER COLUMN transaction_id SET NOT NULL;

-- Create policies for transaction_categories
DROP POLICY IF EXISTS "Users can view their own transaction categories" ON transaction_categories;
CREATE POLICY "Users can view their own transaction categories"
ON transaction_categories
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        JOIN banks b ON b.id = a.bank_id
        WHERE t.id = transaction_categories.transaction_id 
        AND b.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their own transaction categories" ON transaction_categories;
CREATE POLICY "Users can insert their own transaction categories"
ON transaction_categories
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        JOIN banks b ON b.id = a.bank_id
        WHERE t.id = transaction_categories.transaction_id 
        AND b.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own transaction categories" ON transaction_categories;
CREATE POLICY "Users can update their own transaction categories"
ON transaction_categories
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        JOIN banks b ON b.id = a.bank_id
        WHERE t.id = transaction_categories.transaction_id 
        AND b.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        JOIN banks b ON b.id = a.bank_id
        WHERE t.id = transaction_categories.transaction_id 
        AND b.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their own transaction categories" ON transaction_categories;
CREATE POLICY "Users can delete their own transaction categories"
ON transaction_categories
FOR DELETE
USING (
    EXISTS (
        SELECT 1 
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        JOIN banks b ON b.id = a.bank_id
        WHERE t.id = transaction_categories.transaction_id 
        AND b.user_id = auth.uid()
    )
);

-- =====================
-- Transaction Rules
-- =====================
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction_rules
DROP POLICY IF EXISTS "Users can view their own transaction rules" ON transaction_rules;
CREATE POLICY "Users can view their own transaction rules"
ON transaction_rules
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own transaction rules" ON transaction_rules;
CREATE POLICY "Users can insert their own transaction rules"
ON transaction_rules
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own transaction rules" ON transaction_rules;
CREATE POLICY "Users can update their own transaction rules"
ON transaction_rules
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own transaction rules" ON transaction_rules;
CREATE POLICY "Users can delete their own transaction rules"
ON transaction_rules
FOR DELETE
USING (user_id = auth.uid());