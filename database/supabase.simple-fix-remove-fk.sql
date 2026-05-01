-- SIMPLE FIX - Just remove the problematic foreign key constraint
-- Run this in Supabase SQL Editor

-- Remove the foreign key constraint entirely
ALTER TABLE public.loan_applications 
DROP CONSTRAINT IF EXISTS loan_applications_loan_id_fkey CASCADE;

-- Add updated_at column if missing
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
