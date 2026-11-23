-- ============================================================
-- TradeWiseTabs - Database Schema Updates
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add password column to profiles table (for admin password visibility)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Enable real-time for profiles table (so admin UI sees new users instantly)
-- Note: This is optional - if you don't have the 'supabase_realtime' extension,
-- the polling fallback in the admin UI will handle it.
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;