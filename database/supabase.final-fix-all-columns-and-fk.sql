-- FINAL FIX - Remove updated_at and fix foreign key once and for all
-- Run this in Supabase SQL Editor - This will fix everything

-- Step 1: Check actual table structure and fix loan_applications
DO $$
BEGIN
    -- Add updated_at column only if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loan_applications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.loan_applications 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 2: Find and drop ALL foreign key constraints on loan_applications.loan_id
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'loan_applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'loan_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.loan_applications DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.constraint_name) || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Step 3: Verify funding_options table exists and has proper structure
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

-- Step 5: Make loan_id nullable to allow applications without funding option
ALTER TABLE public.loan_applications
ALTER COLUMN loan_id DROP NOT NULL;

-- Step 6: Create the CORRECT foreign key constraint pointing to funding_options
DO $$
BEGIN
    -- Only create if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'loan_applications_loan_id_fkey'
        AND table_name = 'loan_applications'
    ) THEN
        ALTER TABLE public.loan_applications
        ADD CONSTRAINT loan_applications_loan_id_fkey
        FOREIGN KEY (loan_id)
        REFERENCES public.funding_options(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint created successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 7: Verify the constraint points to the right table
DO $$
DECLARE
    ref_table TEXT;
BEGIN
    SELECT ccu.table_name INTO ref_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'loan_applications'
    AND tc.constraint_name = 'loan_applications_loan_id_fkey'
    AND tc.constraint_type = 'FOREIGN KEY';
    
    IF ref_table = 'funding_options' THEN
        RAISE NOTICE 'SUCCESS: Foreign key correctly points to funding_options';
    ELSE
        RAISE WARNING 'Foreign key points to: % (should be funding_options)', ref_table;
    END IF;
END $$;
