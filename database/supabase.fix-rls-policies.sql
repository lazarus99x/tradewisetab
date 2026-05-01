-- Fix Row-Level Security policies for LeverFi platform
-- Run this in Supabase SQL editor to enable proper admin access

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

-- User balances policies
CREATE POLICY "Users can view own balance" ON public.user_balances
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all balances" ON public.user_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can update all balances" ON public.user_balances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can insert balances" ON public.user_balances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

-- Funding options policies
CREATE POLICY "Anyone can view active funding options" ON public.funding_options
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can view all funding options" ON public.funding_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can insert funding options" ON public.funding_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can update funding options" ON public.funding_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

-- Loan applications policies
CREATE POLICY "Users can view own applications" ON public.loan_applications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own applications" ON public.loan_applications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all applications" ON public.loan_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can update all applications" ON public.loan_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

-- Announcements policies
CREATE POLICY "Anyone can view active announcements" ON public.announcements
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can view all announcements" ON public.announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can insert announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );

CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'admin' = 'true'
           OR auth.users.raw_user_meta_data->>'isAdmin' = 'true')
    )
  );
