-- MINIMAL FIX - Only add what's missing, don't recreate existing tables
-- Run this in Supabase SQL Editor

-- Check if transactions table exists and has the right structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions if not already enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;

-- Create simple policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true);

-- Drop existing policies on user_balances to avoid conflicts
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can update all balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can insert balances" ON public.user_balances;

-- Create simple policies for user_balances
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all balances" ON public.user_balances
    FOR SELECT USING (true);

CREATE POLICY "Admins can update all balances" ON public.user_balances
    FOR UPDATE USING (true);

CREATE POLICY "Admins can insert balances" ON public.user_balances
    FOR INSERT WITH CHECK (true);
