-- 04_storage_and_security.sql
-- Storage buckets and security policies

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('funding-images', 'funding-images', true) ON CONFLICT (id) DO NOTHING;

-- 2. Ensure buckets are public/private as intended
UPDATE storage.buckets SET public = false WHERE id = 'kyc';
UPDATE storage.buckets SET public = true WHERE id = 'deposit-proofs';
UPDATE storage.buckets SET public = true WHERE id = 'funding-images';

-- 3. Storage Policies (Public read for public buckets)
DROP POLICY IF EXISTS "Public access to deposit proofs" ON storage.objects;
CREATE POLICY "Public access to deposit proofs" ON storage.objects FOR SELECT USING (bucket_id = 'deposit-proofs');

DROP POLICY IF EXISTS "Public access to funding images" ON storage.objects;
CREATE POLICY "Public access to funding images" ON storage.objects FOR SELECT USING (bucket_id = 'funding-images');

-- 4. Table Security: Disable RLS for development/simplicity
-- (If you want RLS, don't run these and define specific policies instead)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals DISABLE ROW LEVEL SECURITY;
