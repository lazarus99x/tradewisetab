-- This script recalculates the true "funding_balance" for all users 
-- by summing up only their approved "funding_approval" transactions.
-- This will reset erroneously added deposit amounts back to 0 (or their correct funding amount).

UPDATE public.user_balances ub
SET funding_balance = COALESCE((
  SELECT SUM(amount)
  FROM public.transactions t
  WHERE t.user_id = ub.user_id
  AND t.type = 'funding_approval'
), 0);
