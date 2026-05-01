-- 03_funding_and_kyc.sql
-- KYC Submissions and Funding (Loan) System

-- 1. KYC Submissions: document uploads
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reason TEXT, -- Rejection reason
  documents JSONB, -- { id_front, id_back, selfie, address_proof }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_idx on public.kyc_submissions(user_id);

-- 2. Funding Options: created by admin
CREATE TABLE IF NOT EXISTS public.funding_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(20, 2) NOT NULL,
  interest_rate NUMERIC(10, 3) NOT NULL, -- APR %
  duration_days INTEGER NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias for legacy code compatibility
CREATE OR REPLACE VIEW public.loans AS SELECT * FROM public.funding_options;

-- 3. Loan Applications: Funding requests from users
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.funding_options(id) ON DELETE SET NULL, -- Link to offer
  amount NUMERIC(20, 2), -- Optional: specify custom amount
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  rejection_reason TEXT,
  -- All collateral/term fields are NULLABLE for the generic model
  collateral_asset TEXT,
  collateral_amount NUMERIC(20, 2),
  term_months INTEGER,
  interest_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loan_applications_user_id_idx ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS loan_applications_loan_id_idx ON public.loan_applications(loan_id);
