-- Make deposit-proofs bucket public so admin can view images via getPublicUrl
UPDATE storage.buckets 
SET public = true 
WHERE id = 'deposit-proofs';

-- Create public read policy just in case
DROP POLICY IF EXISTS "Anyone can view public deposit proofs" ON storage.objects;
CREATE POLICY "Anyone can view public deposit proofs" ON storage.objects
  FOR SELECT
  USING ( bucket_id = 'deposit-proofs' );
