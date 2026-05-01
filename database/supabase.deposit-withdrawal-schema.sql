-- Deposit and Withdrawal System Schema
-- Run this in Supabase SQL Editor

-- 1. Wallet addresses table (admin-managed)
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT')),
  address TEXT NOT NULL,
  network TEXT, -- e.g., 'Bitcoin', 'Ethereum', 'TRC20', 'ERC20'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(currency, active) -- Only one active wallet per currency
);

-- 2. Deposit requests table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT')),
  amount NUMERIC(15, 2) NOT NULL,
  source TEXT, -- e.g., exchange name or wallet name
  proof_url TEXT, -- URL to uploaded proof of transaction
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deposit_requests_user_id_idx ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS deposit_requests_status_idx ON public.deposit_requests(status);

-- 3. Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT')),
  amount NUMERIC(15, 2) NOT NULL,
  destination_address TEXT NOT NULL,
  network TEXT, -- e.g., 'Bitcoin', 'Ethereum', 'TRC20', 'ERC20'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  rejection_reason TEXT,
  admin_notes TEXT,
  transaction_hash TEXT, -- Blockchain transaction hash if approved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_user_id_idx ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx ON public.withdrawal_requests(status);

-- 4. Enable RLS
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for wallet_addresses (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view active wallet addresses" ON public.wallet_addresses;
CREATE POLICY "Anyone can view active wallet addresses" ON public.wallet_addresses
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can manage wallet addresses" ON public.wallet_addresses;
CREATE POLICY "Admins can manage wallet addresses" ON public.wallet_addresses
  FOR ALL USING (true); -- Simplified for admin access

-- 6. RLS Policies for deposit_requests
DROP POLICY IF EXISTS "Users can view own deposit requests" ON public.deposit_requests;
CREATE POLICY "Users can view own deposit requests" ON public.deposit_requests
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create deposit requests" ON public.deposit_requests;
CREATE POLICY "Users can create deposit requests" ON public.deposit_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins can view all deposit requests" ON public.deposit_requests;
CREATE POLICY "Admins can view all deposit requests" ON public.deposit_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update deposit requests" ON public.deposit_requests;
CREATE POLICY "Admins can update deposit requests" ON public.deposit_requests
  FOR UPDATE USING (true);

-- 7. RLS Policies for withdrawal_requests
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests
  FOR UPDATE USING (true);

-- 8. Create storage bucket for deposit proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- 9. Storage RLS policies for deposit-proofs
-- Drop all existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can view deposit proofs" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload deposit proofs" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'deposit-proofs' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view all files in deposit-proofs bucket
CREATE POLICY "Authenticated users can view deposit proofs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'deposit-proofs' AND
    auth.role() = 'authenticated'
  );

-- 10. Insert default wallet addresses (admin will update these via UI)
INSERT INTO public.wallet_addresses (currency, address, network, active)
VALUES
  ('BTC', 'Please set wallet address in admin panel', 'Bitcoin', true),
  ('ETH', 'Please set wallet address in admin panel', 'Ethereum', true),
  ('USDT', 'Please set wallet address in admin panel', 'TRC20', true)
ON CONFLICT DO NOTHING;

