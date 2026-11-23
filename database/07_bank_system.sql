-- 07_bank_system.sql
-- Bank deposit methods + user bank accounts + avatar emoji system

-- 1. Admin-configured bank deposit methods (shown to users for deposits)
CREATE TABLE IF NOT EXISTS public.bank_deposit_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  sort_code TEXT,
  swift_code TEXT,
  routing_number TEXT,
  currency TEXT DEFAULT 'USD',
  active BOOLEAN DEFAULT true,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_deposit_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active bank methods" ON public.bank_deposit_methods;
CREATE POLICY "Anyone can view active bank methods" ON public.bank_deposit_methods
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can manage bank methods" ON public.bank_deposit_methods;
CREATE POLICY "Admins can manage bank methods" ON public.bank_deposit_methods
  FOR ALL USING (true);

-- 2. User bank accounts (for withdrawals - users add their own bank details)
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  sort_code TEXT,
  swift_code TEXT,
  routing_number TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can create own bank accounts" ON public.user_bank_accounts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can delete own bank accounts" ON public.user_bank_accounts
  FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins can view all bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Admins can view all bank accounts" ON public.user_bank_accounts
  FOR SELECT USING (true);

-- 3. Add avatar_emoji column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🚀';

-- 4. Extend deposit_requests to support bank method
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS method_type TEXT DEFAULT 'crypto';
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS bank_method_id UUID REFERENCES public.bank_deposit_methods(id);

-- 5. Extend withdrawal_requests to support bank method
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS method_type TEXT DEFAULT 'crypto';
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS user_bank_account_id UUID REFERENCES public.user_bank_accounts(id);
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS sort_code TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS swift_code TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS routing_number TEXT;

-- Remove CHECK constraint on currency if it restricts to just crypto
ALTER TABLE public.deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_currency_check;
ALTER TABLE public.deposit_requests ADD CONSTRAINT deposit_requests_currency_check
  CHECK (currency IN ('BTC', 'ETH', 'USDT', 'USD', 'BANK'));

ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_currency_check;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_currency_check
  CHECK (currency IN ('BTC', 'ETH', 'USDT', 'USD', 'BANK'));

-- 6. Wallet addresses: widen currency check
ALTER TABLE public.wallet_addresses DROP CONSTRAINT IF EXISTS wallet_addresses_currency_check;