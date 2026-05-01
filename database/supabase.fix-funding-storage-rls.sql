-- Fix Storage and Tables for Funding Loans
-- Run this in Supabase SQL Editor

-- 1. Create loan_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    loan_id UUID REFERENCES public.funding_options(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on loan_applications
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;

-- 4. Create simple policies for loan_applications
CREATE POLICY "Users can view own applications" ON public.loan_applications
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own applications" ON public.loan_applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all applications" ON public.loan_applications
    FOR SELECT USING (true);

CREATE POLICY "Admins can update all applications" ON public.loan_applications
    FOR UPDATE USING (true);

-- 5. Create funding-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('funding-images', 'funding-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Fix Storage RLS policies for funding-images bucket
-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public can view funding images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'funding-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload funding images" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'funding-images' 
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Users can update own funding images" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'funding-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own funding images" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'funding-images' 
        AND auth.role() = 'authenticated'
    );
