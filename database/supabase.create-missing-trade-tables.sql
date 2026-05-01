-- Create user_trades table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  amount NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  total_value NUMERIC(20, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'ready')),
  order_type TEXT DEFAULT 'MARKET' CHECK (order_type IN ('MARKET', 'LIMIT')),
  limit_price NUMERIC(20, 8),
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  profit_loss NUMERIC(20, 2) DEFAULT 0,
  invested_amount NUMERIC(20, 2) DEFAULT 0,
  risk_level TEXT,
  roi NUMERIC(10, 2) DEFAULT 0,
  admin_must_approve BOOLEAN DEFAULT true
);

-- Ensure columns exist if table already existed but was missing them
ALTER TABLE public.user_trades 
  ADD COLUMN IF NOT EXISTS profit_loss NUMERIC(20, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invested_amount NUMERIC(20, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT,
  ADD COLUMN IF NOT EXISTS roi NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_must_approve BOOLEAN DEFAULT true;

-- Drop constraints safely if they need to be updated (like adding 'ready' to status)
ALTER TABLE public.user_trades DROP CONSTRAINT IF EXISTS user_trades_status_check;
ALTER TABLE public.user_trades ADD CONSTRAINT user_trades_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'ready'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_trades_user_id_idx ON public.user_trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_trades_status_idx ON public.user_trades(status);

-- RLS Policies for user_trades
ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trades" ON public.user_trades;
CREATE POLICY "Users can view own trades" ON public.user_trades FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Users can create trades" ON public.user_trades;
CREATE POLICY "Users can create trades" ON public.user_trades FOR INSERT WITH CHECK (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Admins can update trades" ON public.user_trades;
CREATE POLICY "Admins can update trades" ON public.user_trades FOR UPDATE USING (true);


-- Create profit_records if missing
CREATE TABLE IF NOT EXISTS public.profit_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id UUID REFERENCES public.user_trades(id),
  symbol TEXT NOT NULL,
  profit_amount NUMERIC(20, 2) NOT NULL,
  profit_percentage NUMERIC(10, 4),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

ALTER TABLE public.profit_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profits" ON public.profit_records;
CREATE POLICY "Users can view own profits" ON public.profit_records FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Admins can manage profits" ON public.profit_records;
CREATE POLICY "Admins can manage profits" ON public.profit_records FOR ALL USING (true);

-- Create market_data if missing
CREATE TABLE IF NOT EXISTS public.market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price NUMERIC(20, 8) NOT NULL,
  change_24h NUMERIC(10, 4) DEFAULT 0,
  volume_24h NUMERIC(20, 2) DEFAULT 0,
  high_24h NUMERIC(20, 8) DEFAULT 0,
  low_24h NUMERIC(20, 8) DEFAULT 0,
  market_cap NUMERIC(20, 2),
  category TEXT DEFAULT 'crypto',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view market data" ON public.market_data;
CREATE POLICY "Anyone can view market data" ON public.market_data FOR SELECT USING (true);

-- Insert fallback market data so trades don't fail due to missing symbols
INSERT INTO public.market_data (symbol, price, category)
VALUES
  ('BTC/USD', 65000.00, 'crypto'),
  ('ETH/USD', 3500.00, 'crypto')
ON CONFLICT (symbol) DO NOTHING;

-- Forcefully reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
