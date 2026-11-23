-- Grant admin role to support user
-- Run in Supabase SQL Editor

-- Create user in profiles if not exists, then set role = 'admin'
INSERT INTO public.profiles (user_id, email, role, full_name)
VALUES (
  'support-tradewisetabs',\n  'supporttradewisetabs@rsuuv.xyz',
  'admin',
  'Support Admin'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Also try matching by email if user already exists with a different ID
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'supportemiratescapital@rsuuv.xyz';

-- Create user_balances entry if missing
INSERT INTO public.user_balances (user_id, account_balance, profit_balance, loss_balance, trading_balance, funding_balance, balance)
SELECT user_id, 0, 0, 0, 0, 0, 0
FROM public.profiles
WHERE email = 'supportemiratescapital@rsuuv.xyz'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_balances ub
    WHERE ub.user_id = profiles.user_id
  );

-- Verify
SELECT email, role, full_name, user_id
FROM public.profiles
WHERE email = 'supportemiratescapital@rsuuv.xyz';