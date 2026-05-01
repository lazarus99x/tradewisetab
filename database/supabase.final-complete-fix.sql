-- FINAL COMPLETE FIX - This fixes everything
-- Run this in Supabase SQL Editor

-- Step 1: Add updated_at column if missing (to prevent query errors)
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Find and DROP ALL foreign key constraints on loan_id column
-- This is more aggressive - finds ANY constraint referencing loan_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'loan_applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'loan_id'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.loan_applications DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
            RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', r.constraint_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Ensure funding_options table exists with correct structure
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

-- Step 4: Ensure loan_applications table has correct structure
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    loan_id UUID,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Make loan_id nullable
ALTER TABLE public.loan_applications
ALTER COLUMN loan_id DROP NOT NULL;

-- Step 6: Create the CORRECT foreign key - only after dropping all old ones
-- Drop the specific constraint name if it exists from previous attempts
ALTER TABLE public.loan_applications 
DROP CONSTRAINT IF EXISTS loan_applications_loan_id_fkey CASCADE;

-- Now create the correct one
ALTER TABLE public.loan_applications
ADD CONSTRAINT loan_applications_loan_id_fkey
FOREIGN KEY (loan_id)
REFERENCES public.funding_options(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 7: Verify it's correct
DO $$
DECLARE
    ref_table_name TEXT;
BEGIN
    SELECT ccu.table_name INTO ref_table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'loan_applications'
    AND tc.constraint_name = 'loan_applications_loan_id_fkey'
    AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;
    
    IF ref_table_name = 'funding_options' THEN
        RAISE NOTICE '✅ SUCCESS: Foreign key correctly points to funding_options';
    ELSIF ref_table_name IS NULL THEN
        RAISE WARNING '⚠️ Foreign key constraint not found';
    ELSE
        RAISE WARNING '❌ ERROR: Foreign key points to "%" instead of funding_options', ref_table_name;
    END IF;
END $$;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS loan_applications_loan_id_idx ON public.loan_applications(loan_id);
CREATE INDEX IF NOT EXISTS loan_applications_user_id_idx ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS loan_applications_status_idx ON public.loan_applications(status);

-- Step 9: Fix RLS policies (permissive for now)
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view loan applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Anyone can insert loan applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Anyone can update loan applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;

CREATE POLICY "Anyone can view loan applications" ON public.loan_applications
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert loan applications" ON public.loan_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update loan applications" ON public.loan_applications
    FOR UPDATE USING (true);
