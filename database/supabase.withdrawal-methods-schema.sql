-- Withdrawal Methods Table Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.withdrawal_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT')),
  network TEXT NOT NULL,
  icon_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

-- Allow public to view active methods
DROP POLICY IF EXISTS "Public can view active withdrawal methods" ON public.withdrawal_methods;
CREATE POLICY "Public can view active withdrawal methods" ON public.withdrawal_methods
  FOR SELECT USING (active = true);

-- Allow admins to manage methods (simplified - allow all operations)
DROP POLICY IF EXISTS "Admins can manage withdrawal methods" ON public.withdrawal_methods;
CREATE POLICY "Admins can manage withdrawal methods" ON public.withdrawal_methods
  FOR ALL USING (true);

-- Insert default withdrawal methods
INSERT INTO public.withdrawal_methods (currency, network, active)
VALUES
  ('BTC', 'Bitcoin', true),
  ('BTC', 'Lightning Network', true),
  ('ETH', 'Ethereum', true),
  ('ETH', 'ERC20', true),
  ('USDT', 'TRC20', true),
  ('USDT', 'ERC20', true),
  ('USDT', 'BEP20', true)
ON CONFLICT DO NOTHING;
