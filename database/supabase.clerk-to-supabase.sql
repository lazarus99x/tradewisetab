-- ==============================================================================
-- MIGRATION SCRIPT: Clerk to Supabase Auth
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create a trigger to automatically create a profile when a new Supabase user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  );

  -- Also initialize zero balances for the new user
  INSERT INTO public.user_balances (user_id, balance, account_balance, profit_balance, trading_balance, funding_balance)
  VALUES (NEW.id, 0, 0, 0, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Optional: If you want to disable email confirmation for easier testing
-- Go to Supabase Dashboard -> Authentication -> Providers -> Email -> Toggle off "Confirm email"

SELECT 'Supabase Auth setup complete. Trigger created to auto-generate profiles.' as result;
