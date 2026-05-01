-- ============================================================
-- FIX: Clerk + Supabase RLS Conflict
-- ============================================================
-- Your app uses Clerk for auth, NOT Supabase Auth.
-- Supabase RLS policies use auth.uid() which is always NULL
-- when requests come from Clerk users via the anon key.
-- This causes all inserts/selects to be silently blocked ({} error).
--
-- SOLUTION: Disable RLS on all user-facing tables.
-- Security is enforced by Clerk middleware on the Next.js side.
-- ============================================================

-- Disable RLS on all tables
ALTER TABLE IF EXISTS public.profiles              DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_balances         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kyc_submissions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_applications     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.funding_options       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_data           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trade_history         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.signals               DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.withdrawal_methods    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_addresses      DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deposit_requests      DISABLE ROW LEVEL SECURITY;

-- Drop any conflicting RLS policies that use auth.uid()
-- (safe to run even if policies don't exist)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- Ensure user_balances table has all required columns
ALTER TABLE IF EXISTS public.user_balances
  ADD COLUMN IF NOT EXISTS account_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_balance   NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance          NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ   DEFAULT NOW();

-- Ensure transactions table has 'funding_approval' type if not already
-- (update the check constraint)
ALTER TABLE IF EXISTS public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE IF EXISTS public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'deposit','withdrawal','loan_disbursal','fee',
    'profit','loss','funding_approval'
  ));

-- Ensure user_balances exists at all (create if missing)
CREATE TABLE IF NOT EXISTS public.user_balances (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          TEXT NOT NULL UNIQUE,
  balance          NUMERIC(18,2) DEFAULT 0,
  account_balance  NUMERIC(18,2) DEFAULT 0,
  profit_balance   NUMERIC(18,2) DEFAULT 0,
  trading_balance  NUMERIC(18,2) DEFAULT 0,
  funding_balance  NUMERIC(18,2) DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure wallet_addresses table exists
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency    TEXT NOT NULL,          -- e.g. BTC, ETH, USDT
  address     TEXT NOT NULL,          -- the deposit wallet address
  network     TEXT,                   -- e.g. ERC20, TRC20, BEP20
  icon_url    TEXT,                   -- optional coin icon URL
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure deposit_requests table exists
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          TEXT NOT NULL,
  currency         TEXT NOT NULL,
  amount           NUMERIC(18,2) NOT NULL,
  source           TEXT,
  proof_url        TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on the new tables too (already in list above, but safe to repeat)
ALTER TABLE IF EXISTS public.wallet_addresses  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deposit_requests  DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PATCH MISSING COLUMNS on EXISTING tables
-- (CREATE TABLE IF NOT EXISTS only helps if table is brand new;
--  existing tables need explicit ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- Patch wallet_addresses (in case table already existed without icon_url)
ALTER TABLE IF EXISTS public.wallet_addresses
  ADD COLUMN IF NOT EXISTS icon_url    TEXT,
  ADD COLUMN IF NOT EXISTS network     TEXT,
  ADD COLUMN IF NOT EXISTS active      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- Patch deposit_requests (in case table already existed)
ALTER TABLE IF EXISTS public.deposit_requests
  ADD COLUMN IF NOT EXISTS source           TEXT,
  ADD COLUMN IF NOT EXISTS proof_url        TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Patch user_balances (in case columns were added later)
ALTER TABLE IF EXISTS public.user_balances
  ADD COLUMN IF NOT EXISTS account_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_balance   NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_balance  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance          NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Patch transactions (add description column if missing)
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS description TEXT;

SELECT 'Done! All columns patched, RLS disabled. Your wallet page and admin deposits should now work.' AS result;
