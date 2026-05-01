-- Add icon_url column to wallet_addresses table
-- Run this in Supabase SQL Editor

ALTER TABLE public.wallet_addresses 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

