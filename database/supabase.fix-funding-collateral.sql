-- Remove NOT NULL constraints from loan_applications table since it is now used for generic funding
-- Run this in the Supabase SQL editor

ALTER TABLE public.loan_applications ALTER COLUMN collateral_asset DROP NOT NULL;
ALTER TABLE public.loan_applications ALTER COLUMN collateral_amount DROP NOT NULL;
ALTER TABLE public.loan_applications ALTER COLUMN term_months DROP NOT NULL;
ALTER TABLE public.loan_applications ALTER COLUMN interest_rate DROP NOT NULL;
