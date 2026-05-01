-- Add missing columns for bot trading sessions and profit/loss management to user_trades
ALTER TABLE public.user_trades 
  ADD COLUMN IF NOT EXISTS profit_loss NUMERIC(20, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invested_amount NUMERIC(20, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT,
  ADD COLUMN IF NOT EXISTS roi NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_must_approve BOOLEAN DEFAULT true;

-- Forcefully reload the PostgREST schema cache so the UI doesn't crash when querying these
NOTIFY pgrst, 'reload schema';
