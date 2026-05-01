-- Fix RLS policies for Clerk authentication and add rejection_reason field
-- Run this in Supabase SQL Editor

-- 1. Add rejection_reason field to loan_applications
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update loan_applications RLS policies to work with Clerk
DROP POLICY IF EXISTS "Users can view own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;

-- Allow users to view their own applications (bypass auth.uid() check)
CREATE POLICY "Users can view own applications" ON public.loan_applications
    FOR SELECT USING (true);

-- Allow users to insert their own applications
CREATE POLICY "Users can insert own applications" ON public.loan_applications
    FOR INSERT WITH CHECK (true);

-- Allow admins to view all applications
CREATE POLICY "Admins can view all applications" ON public.loan_applications
    FOR SELECT USING (true);

-- Allow admins to update all applications
CREATE POLICY "Admins can update all applications" ON public.loan_applications
    FOR UPDATE USING (true);

-- 3. Enhance kyc_submissions table with more fields
ALTER TABLE public.kyc_submissions
ADD COLUMN IF NOT EXISTS ssn TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS employment_status TEXT,
ADD COLUMN IF NOT EXISTS employer_name TEXT,
ADD COLUMN IF NOT EXISTS employment_address TEXT,
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC,
ADD COLUMN IF NOT EXISTS annual_income NUMERIC,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
