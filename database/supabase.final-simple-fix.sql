-- FINAL SIMPLE FIX - Run this once in Supabase SQL Editor
-- This makes everything work simply without complex RLS

-- 1. Create/Update deposit-proofs bucket as PUBLIC with simple access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  true, -- PUBLIC bucket (simple!)
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760;

-- 2. Drop ALL policies for deposit-proofs (start fresh)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view own deposit proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone authenticated can view deposit proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads to deposit-proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated selects from deposit-proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes from deposit-proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view deposit proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Allow inserts to deposit-proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Allow deletes from deposit-proofs" ON storage.objects;
END $$;

-- 3. Create ONE simple policy - allow everything for this bucket
CREATE POLICY "deposit-proofs-public-access" ON storage.objects
  FOR ALL
  USING (bucket_id = 'deposit-proofs')
  WITH CHECK (bucket_id = 'deposit-proofs');

