-- Complete Fix for Foreign Key Constraint Issue
-- Run this in Supabase SQL Editor

-- 1. First, ensure funding_options table exists with proper structure
CREATE TABLE IF NOT EXISTS public.funding_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL,
    interest_rate NUMERIC,
    duration_days INTEGER,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure loan_applications table exists
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    loan_id UUID,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Drop existing foreign key constraint if it exists and is problematic
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'loan_applications_loan_id_fkey'
        AND table_name = 'loan_applications'
    ) THEN
        ALTER TABLE public.loan_applications
        DROP CONSTRAINT loan_applications_loan_id_fkey;
    END IF;
END $$;

-- 4. Recreate foreign key constraint with proper settings
ALTER TABLE public.loan_applications
ADD CONSTRAINT loan_applications_loan_id_fkey
FOREIGN KEY (loan_id)
REFERENCES public.funding_options(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 5. Make loan_id nullable to handle cases where funding option might be deleted
ALTER TABLE public.loan_applications
ALTER COLUMN loan_id DROP NOT NULL;

-- 6. Add index for better performance
CREATE INDEX IF NOT EXISTS loan_applications_loan_id_idx 
ON public.loan_applications(loan_id);

CREATE INDEX IF NOT EXISTS loan_applications_user_id_idx 
ON public.loan_applications(user_id);

-- 7. Enable RLS
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_options ENABLE ROW LEVEL SECURITY;

-- 8. Update RLS policies for loan_applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;

CREATE POLICY "Users can view own applications" ON public.loan_applications
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own applications" ON public.loan_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all applications" ON public.loan_applications
    FOR SELECT USING (true);

CREATE POLICY "Admins can update all applications" ON public.loan_applications
    FOR UPDATE USING (true);
