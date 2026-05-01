-- 01_master_schema.sql
-- Core user and financial tables

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles: one row per user (Clerk/Supabase ID)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected','suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Balances: tracking various financial buckets
CREATE TABLE IF NOT EXISTS public.user_balances (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  account_balance NUMERIC(20, 2) DEFAULT 0, -- Tradable principal
  profit_balance NUMERIC(20, 2) DEFAULT 0,  -- Total profit accrued
  loss_balance NUMERIC(20, 2) DEFAULT 0,    -- Total loss accrued
  trading_balance NUMERIC(20, 2) DEFAULT 0, -- Active margin/collateral
  funding_balance NUMERIC(20, 2) DEFAULT 0, -- External funding received
  balance NUMERIC(20, 2) DEFAULT 0,         -- Legacy/Total field
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions: audit log of all balance changes
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deposit, withdrawal, profit, loss, loan_disbursal, funding_approval
  amount NUMERIC(20, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id, created_at DESC);

-- 4. Wallet Addresses: admin-defined deposit destinations
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  currency TEXT NOT NULL, -- BTC, ETH, USDT
  address TEXT NOT NULL,
  network TEXT,
  is_active BOOLEAN DEFAULT true,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deposit Requests: user-submitted proof of payment
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  source TEXT, -- exchange name or wallet
  proof_url TEXT, -- URL to uploaded image
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deposit_requests_user_id_idx ON public.deposit_requests(user_id);

-- 6. Withdrawal Methods: user-saved payout info
CREATE TABLE IF NOT EXISTS public.withdrawal_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  method_type TEXT NOT NULL, -- crypto, bank, etc.
  currency TEXT,
  details JSONB NOT NULL, -- { address, network } or { bank_name, account_number, routing }
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: update_user_balance
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id TEXT,
    p_account_delta NUMERIC DEFAULT 0,
    p_profit_delta NUMERIC DEFAULT 0,
    p_loss_delta NUMERIC DEFAULT 0,
    p_funding_delta NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_balances
    SET 
        account_balance = account_balance + p_account_delta,
        profit_balance = profit_balance + p_profit_delta,
        loss_balance = loss_balance + p_loss_delta,
        funding_balance = funding_balance + p_funding_delta,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_balances (
            user_id, account_balance, profit_balance, loss_balance, funding_balance, created_at, updated_at
        ) VALUES (
            p_user_id, p_account_delta, p_profit_delta, p_loss_delta, p_funding_delta, NOW(), NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
