-- targeted fix for missing columns
-- Run this in Supabase SQL Editor

-- 1. Fix kyc_submissions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='kyc_submissions' AND column_name='reason') THEN
        ALTER TABLE public.kyc_submissions ADD COLUMN reason TEXT;
    END IF;
END $$;

-- 2. Ensure loan_applications is robust
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='loan_applications' AND column_name='rejection_reason') THEN
        ALTER TABLE public.loan_applications ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- Ensure collateral fields are nullable to prevent previous errors
    ALTER TABLE public.loan_applications ALTER COLUMN collateral_asset DROP NOT NULL;
    ALTER TABLE public.loan_applications ALTER COLUMN collateral_amount DROP NOT NULL;
END $$;
