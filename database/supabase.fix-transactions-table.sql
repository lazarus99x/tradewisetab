-- Fix the transactions table structure to match what the code expects
-- Run this in Supabase SQL Editor

-- Add the missing description column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- If the table doesn't exist at all, create it with the right structure
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;

-- Create simple policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true);
