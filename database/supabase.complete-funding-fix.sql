DO $$ 
BEGIN
    -- 1. Safely drop loan_applications (Table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_applications' AND table_schema = 'public') THEN
        DROP TABLE public.loan_applications CASCADE;
    END IF;

    -- 2. Safely drop loans (could be table or view)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
        DROP TABLE public.loans CASCADE;
    ELSIF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'loans' AND table_schema = 'public') THEN
        DROP VIEW public.loans CASCADE;
    END IF;

    -- 3. Safely drop funding_options (could be table or view)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funding_options' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
        DROP TABLE public.funding_options CASCADE;
    ELSIF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'funding_options' AND table_schema = 'public') THEN
        DROP VIEW public.funding_options CASCADE;
    END IF;
END $$;

-- NOW RECREATE EVERYTHING FRESH
-- 1. Physical Table for Funding
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

-- 2. Applications Table
CREATE TABLE public.loan_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.funding_options(id) ON DELETE SET NULL,
  amount NUMERIC(20, 2),
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  rejection_reason TEXT,
  collateral_asset TEXT,
  collateral_amount NUMERIC(20, 2),
  term_months INTEGER,
  interest_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Aliases & Permissions
CREATE OR REPLACE VIEW public.loans AS SELECT * FROM public.funding_options;
ALTER TABLE public.funding_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications DISABLE ROW LEVEL SECURITY;

-- 4. Seed Data
INSERT INTO public.funding_options (title, amount, interest_rate, duration_days, status)
VALUES ('Professional Funding', 5000.00, 3.5, 90, 'active')
ON CONFLICT DO NOTHING;
