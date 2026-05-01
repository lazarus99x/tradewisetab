-- Fix foreign key constraint issue for loan_applications
-- Run this in Supabase SQL Editor

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.loan_applications
DROP CONSTRAINT IF EXISTS loan_applications_loan_id_fkey;

-- Recreate the foreign key constraint with proper settings
ALTER TABLE public.loan_applications
ADD CONSTRAINT loan_applications_loan_id_fkey
FOREIGN KEY (loan_id)
REFERENCES public.funding_options(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- If the constraint still causes issues, make loan_id nullable and optional
-- First, check if making it nullable would help:
-- ALTER TABLE public.loan_applications
-- ALTER COLUMN loan_id DROP NOT NULL;

-- Verify the funding_options table structure
-- Ensure funding_options.id is UUID type and has proper constraints
DO $$
BEGIN
  -- Check if funding_options table exists and has id column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funding_options') THEN
    -- Ensure id is UUID with default
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'funding_options' 
      AND column_name = 'id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.funding_options 
      ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
  ELSE
    -- Create funding_options table if it doesn't exist
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
  END IF;
END $$;
