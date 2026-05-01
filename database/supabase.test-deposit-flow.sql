-- Test script to verify deposit functionality
-- Run this in Supabase SQL editor to test the deposit flow

-- 1. Check if user_balances table exists and has data
SELECT 'user_balances table check:' as test_step;
SELECT COUNT(*) as total_records FROM user_balances;
SELECT * FROM user_balances LIMIT 5;

-- 2. Check if transactions table exists and has data
SELECT 'transactions table check:' as test_step;
SELECT COUNT(*) as total_records FROM transactions;
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;

-- 3. Test creating a balance record for a test user
SELECT 'Creating test balance record:' as test_step;
INSERT INTO user_balances (user_id, account_balance, profit_balance, loss_balance, funding_balance)
VALUES ('test_user_123', 0, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Test updating the balance (simulate a deposit)
SELECT 'Testing balance update:' as test_step;
UPDATE user_balances 
SET 
  account_balance = account_balance + 100,
  funding_balance = funding_balance + 100,
  updated_at = NOW()
WHERE user_id = 'test_user_123';

-- 5. Test creating a transaction record
SELECT 'Testing transaction creation:' as test_step;
INSERT INTO transactions (user_id, type, amount, description)
VALUES ('test_user_123', 'deposit', 100, 'Test deposit');

-- 6. Verify the changes
SELECT 'Verification - checking updated balance:' as test_step;
SELECT * FROM user_balances WHERE user_id = 'test_user_123';

SELECT 'Verification - checking transaction:' as test_step;
SELECT * FROM transactions WHERE user_id = 'test_user_123' ORDER BY created_at DESC;

-- 7. Clean up test data
SELECT 'Cleaning up test data:' as test_step;
DELETE FROM transactions WHERE user_id = 'test_user_123';
DELETE FROM user_balances WHERE user_id = 'test_user_123';
