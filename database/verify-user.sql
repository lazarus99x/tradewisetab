-- 1. Mark the user's email as verified in the Supabase Auth system
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'orlandotrevino8@gmail.com';

-- 2. Create the missing user_balance record so you don't get the "Failed to create user balance" error
-- (This fixes the RLS or missing record issue for this seeded user)
INSERT INTO public.user_balances (user_id, account_balance, profit_balance, funding_balance)
SELECT id, 0, 0, 0
FROM auth.users
WHERE email = 'orlandotrevino8@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Ensure they have a profile as well, just in case
INSERT INTO public.profiles (user_id, full_name, email, kyc_status)
SELECT id, 'Orlando Trevino', 'orlandotrevino8@gmail.com', 'pending'
FROM auth.users
WHERE email = 'orlandotrevino8@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
