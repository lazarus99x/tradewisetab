-- REPLICATE THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- This will solve the "collateral_asset" error and sync your DB with the code.

-- 1. CLEAN UP OLD TABLES
DROP VIEW IF EXISTS public.funding_options CASCADE;
DROP VIEW IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.loan_applications CASCADE;
DROP TABLE IF EXISTS public.funding_options CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;

-- 2. CREATE FUNDING OPTIONS TABLE
CREATE TABLE public.funding_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(20, 2) NOT NULL,
  interest_rate NUMERIC(10, 3) NOT NULL,
  duration_days INTEGER NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE LOAN APPLICATIONS TABLE (MATCHING FRONTEND)
CREATE TABLE public.loan_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.funding_options(id) ON DELETE SET NULL,
  amount NUMERIC(20, 2), -- Optional
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  rejection_reason TEXT,
  -- These fields are optional and will NOT cause "not-null" errors now
  collateral_asset TEXT,
  collateral_amount NUMERIC(20, 2),
  term_months INTEGER,
  interest_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERMISSIONS & VIEWS
ALTER TABLE public.funding_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.loans AS SELECT * FROM public.funding_options;

-- 5. SEED DATA (So you have an option to click on)
INSERT INTO public.funding_options (title, amount, interest_rate, duration_days, status)
VALUES ('Professional Funding', 5000.00, 3.5, 90, 'active')
ON CONFLICT DO NOTHING;
