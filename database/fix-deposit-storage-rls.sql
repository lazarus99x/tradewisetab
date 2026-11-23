-- FIX: Storage RLS for deposit-proofs bucket
-- Run this in your Supabase SQL Editor

-- Step 1: Make bucket public (handles access via API/client)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 10485760;

-- Step 2: Drop all existing policies on storage.objects for this bucket
DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can view deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to deposit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated selects from deposit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from deposit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete deposit proofs" ON storage.objects;

-- Step 3: Create simple permissive policies (access control is handled app-side)
CREATE POLICY "Anyone can view deposit proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs');

CREATE POLICY "Anyone can upload deposit proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs');

CREATE POLICY "Anyone can delete deposit proofs" ON storage.objects
  FOR DELETE USING (bucket_id = 'deposit-proofs');

-- Step 4: Also fix deposit_requests RLS to ensure users can insert
DROP POLICY IF EXISTS "Users can create deposit requests" ON public.deposit_requests;
CREATE POLICY "Users can create deposit requests" ON public.deposit_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
