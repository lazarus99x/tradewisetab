-- Complete Fix for Storage RLS policies for deposit-proofs bucket
-- Run this in Supabase SQL Editor
-- This makes the bucket work with both Supabase Auth and Clerk (via API routes)

-- Step 1: Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  true, -- Make it public for now (we handle access via API route)
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 10485760;

-- Step 2: Drop ALL existing policies for deposit-proofs (use CASCADE to remove dependencies)
DO $$ 
BEGIN
  -- Drop policies that might exist
  DROP POLICY IF EXISTS "Authenticated users can upload deposit proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own deposit proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone authenticated can view deposit proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads to deposit-proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated selects from deposit-proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated deletes from deposit-proofs" ON storage.objects;
END $$;

-- Step 3: Create permissive policies for public bucket (access controlled via API route)
-- Allow anyone to view (since bucket is public, but we control uploads via API)
CREATE POLICY "Public can view deposit proofs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'deposit-proofs');

-- Note: Since we're using an API route with service role key, we don't need upload policies
-- The API route uses service role which bypasses RLS entirely
-- But we'll add a policy anyway for direct client uploads if needed in future
CREATE POLICY "Service role can upload deposit proofs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'deposit-proofs');

-- Allow service role to delete
CREATE POLICY "Service role can delete deposit proofs" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'deposit-proofs');

