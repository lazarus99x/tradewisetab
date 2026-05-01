-- 1. Add missing columns to deposit_requests safely
ALTER TABLE public.deposit_requests 
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Forcefully reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
