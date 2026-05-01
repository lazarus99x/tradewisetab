-- Add separate balance columns to user_balances table
-- Run this in Supabase SQL Editor

-- Add new balance columns if they don't exist
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS account_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trading_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS funding_balance NUMERIC DEFAULT 0;

-- Migrate existing balance data to account_balance
UPDATE public.user_balances 
SET account_balance = balance 
WHERE account_balance = 0 AND balance > 0;

-- Calculate total from existing transactions
UPDATE public.user_balances ub
SET 
  account_balance = COALESCE((
    SELECT SUM(amount) 
    FROM public.transactions 
    WHERE user_id = ub.user_id 
    AND type IN ('deposit', 'loan_disbursal', 'funding_approval')
  ), 0),
  profit_balance = COALESCE((
    SELECT SUM(amount) 
    FROM public.transactions 
    WHERE user_id = ub.user_id 
    AND type = 'profit'
  ), 0),
  trading_balance = COALESCE((
    SELECT SUM(amount) 
    FROM public.transactions 
    WHERE user_id = ub.user_id 
    AND type IN ('deposit', 'loan_disbursal', 'funding_approval')
  ), 0)
WHERE ub.account_balance = 0;

-- Update total balance
UPDATE public.user_balances
SET balance = account_balance + profit_balance;
