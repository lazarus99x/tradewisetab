-- Script to grant admin privileges to a specific user
-- Run this in your Supabase SQL Editor

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'contact@oakbrookadvisors.pro';

-- Optional: Verify the change
SELECT email, role, full_name
FROM public.profiles
WHERE email = 'contact@oakbrookadvisors.pro';
