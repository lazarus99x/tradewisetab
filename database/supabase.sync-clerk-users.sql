-- Helper script to sync Clerk users to Supabase
-- Run this in Supabase SQL editor to create a function for syncing users

CREATE OR REPLACE FUNCTION sync_clerk_user(
  p_user_id text,
  p_full_name text,
  p_email text
) RETURNS void AS $$
BEGIN
  -- Insert or update profile
  INSERT INTO public.profiles (user_id, full_name, email, kyc_status)
  VALUES (p_user_id, p_full_name, p_email, 'pending')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  -- Initialize user balance if not exists
  INSERT INTO public.user_balances (user_id, account_balance, profit_balance, loss_balance, funding_balance)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
