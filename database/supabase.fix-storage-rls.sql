-- Fix Storage RLS policies for deposit-proofs bucket
-- Run this in Supabase SQL Editor

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760;

-- Drop all existing policies first (using DROP IF EXISTS for safety)
DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can view deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to deposit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated selects from deposit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from deposit-proofs" ON storage.objects;

-- Allow authenticated users to upload to deposit-proofs bucket
-- Note: Using auth.uid() IS NOT NULL instead of auth.role() = 'authenticated'
CREATE POLICY "Allow authenticated uploads to deposit-proofs" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'deposit-proofs' AND
    auth.uid() IS NOT NULL
  );

-- Allow authenticated users to view files in deposit-proofs bucket
CREATE POLICY "Allow authenticated selects from deposit-proofs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'deposit-proofs' AND
    auth.uid() IS NOT NULL
  );

-- Also allow authenticated users to delete their own files (for cleanup)
CREATE POLICY "Allow authenticated deletes from deposit-proofs" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'deposit-proofs' AND
    auth.uid() IS NOT NULL
  );

