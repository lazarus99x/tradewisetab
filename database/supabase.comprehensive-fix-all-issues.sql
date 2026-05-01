-- COMPREHENSIVE FIX - Fix all foreign key and table issues
-- Run this in Supabase SQL Editor

-- Step 1: Check and create funding_options table if needed
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

-- Step 2: Ensure loan_applications table exists with correct structure
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    loan_id UUID,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Drop ALL existing foreign key constraints that might be wrong
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'loan_applications'
        AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.loan_applications DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- Step 4: Make loan_id nullable temporarily
ALTER TABLE public.loan_applications
ALTER COLUMN loan_id DROP NOT NULL;

-- Step 5: Create the CORRECT foreign key pointing to funding_options
ALTER TABLE public.loan_applications
ADD CONSTRAINT loan_applications_loan_id_fkey
FOREIGN KEY (loan_id)
REFERENCES public.funding_options(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS loan_applications_loan_id_idx ON public.loan_applications(loan_id);
CREATE INDEX IF NOT EXISTS loan_applications_user_id_idx ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS loan_applications_status_idx ON public.loan_applications(status);

-- Step 7: Fix RLS policies for loan_applications
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Anyone can insert applications" ON public.loan_applications;

-- Very permissive policies for development
CREATE POLICY "Anyone can view loan applications" ON public.loan_applications
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert loan applications" ON public.loan_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update loan applications" ON public.loan_applications
    FOR UPDATE USING (true);

-- Step 8: Fix RLS policies for funding_options
ALTER TABLE public.funding_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active funding options" ON public.funding_options;
DROP POLICY IF EXISTS "Anyone can view funding options" ON public.funding_options;
DROP POLICY IF EXISTS "Anyone can insert funding options" ON public.funding_options;
DROP POLICY IF EXISTS "Anyone can update funding options" ON public.funding_options;

CREATE POLICY "Anyone can view funding options" ON public.funding_options
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert funding options" ON public.funding_options
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update funding options" ON public.funding_options
    FOR UPDATE USING (true);

-- Step 9: Verify the constraint is correct
DO $$
BEGIN
    -- Check if constraint exists and points to correct table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'loan_applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'funding_options'
    ) THEN
        RAISE NOTICE 'Foreign key constraint may need manual fix';
    ELSE
        RAISE NOTICE 'Foreign key constraint is correctly set up';
    END IF;
END $$;
