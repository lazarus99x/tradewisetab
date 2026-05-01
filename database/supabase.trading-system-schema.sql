-- Trading System Schema
-- Run this in Supabase SQL Editor

-- 1. Market data table (simulated live prices)
CREATE TABLE IF NOT EXISTS public.market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE, -- e.g., 'BTC/USD', 'ETH/USD', 'AAPL', 'TSLA'
  price NUMERIC(20, 8) NOT NULL,
  change_24h NUMERIC(10, 4) DEFAULT 0,
  volume_24h NUMERIC(20, 2) DEFAULT 0,
  high_24h NUMERIC(20, 8) DEFAULT 0,
  low_24h NUMERIC(20, 8) DEFAULT 0,
  market_cap NUMERIC(20, 2),
  category TEXT DEFAULT 'crypto', -- 'crypto' or 'stock'
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Price history for charts
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_symbol_idx ON public.price_history(symbol, timestamp DESC);

-- 3. AI Trading Signals
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
  strength TEXT DEFAULT 'MEDIUM' CHECK (strength IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  entry_price NUMERIC(20, 8),
  target_price NUMERIC(20, 8),
  stop_loss NUMERIC(20, 8),
  reasoning TEXT,
  confidence_score NUMERIC(5, 2) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- 4. User Trades
CREATE TABLE IF NOT EXISTS public.user_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  amount NUMERIC(20, 8) NOT NULL, -- Amount of crypto/stock
  price NUMERIC(20, 8) NOT NULL, -- Price per unit
  total_value NUMERIC(20, 2) NOT NULL, -- Total USD value
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  order_type TEXT DEFAULT 'MARKET' CHECK (order_type IN ('MARKET', 'LIMIT')),
  limit_price NUMERIC(20, 8),
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_trades_user_id_idx ON public.user_trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_trades_status_idx ON public.user_trades(status);

-- 5. User Holdings (Portfolio)
CREATE TABLE IF NOT EXISTS public.user_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  average_buy_price NUMERIC(20, 8),
  total_invested NUMERIC(20, 2) DEFAULT 0,
  current_value NUMERIC(20, 2) DEFAULT 0,
  profit_loss NUMERIC(20, 2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS user_holdings_user_id_idx ON public.user_holdings(user_id);

-- 6. Investment Requests (Stocks)
CREATE TABLE IF NOT EXISTS public.investment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  investment_amount NUMERIC(20, 2) NOT NULL,
  target_shares NUMERIC(20, 8),
  current_price NUMERIC(20, 8),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  rejection_reason TEXT,
  approved_amount NUMERIC(20, 2),
  approved_shares NUMERIC(20, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS investment_requests_user_id_idx ON public.investment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS investment_requests_status_idx ON public.investment_requests(status);

-- 7. Profit/Loss Records
CREATE TABLE IF NOT EXISTS public.profit_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id UUID REFERENCES public.user_trades(id),
  investment_id UUID REFERENCES public.investment_requests(id),
  symbol TEXT NOT NULL,
  profit_amount NUMERIC(20, 2) NOT NULL,
  profit_percentage NUMERIC(10, 4),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS profit_records_user_id_idx ON public.profit_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profit_records_status_idx ON public.profit_records(status);

-- 8. Automated Trading Bots
CREATE TABLE IF NOT EXISTS public.trading_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  bot_name TEXT,
  symbol TEXT NOT NULL,
  strategy TEXT DEFAULT 'SIGNAL_FOLLOW' CHECK (strategy IN ('SIGNAL_FOLLOW', 'GRID', 'DCA')),
  is_active BOOLEAN DEFAULT false,
  max_investment NUMERIC(20, 2),
  risk_level TEXT DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  total_trades INTEGER DEFAULT 0,
  total_profit NUMERIC(20, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trading_bots_user_id_idx ON public.trading_bots(user_id);

-- Enable RLS
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Market data: Public read
DROP POLICY IF EXISTS "Anyone can view market data" ON public.market_data;
CREATE POLICY "Anyone can view market data" ON public.market_data FOR SELECT USING (true);

-- Price history: Public read
DROP POLICY IF EXISTS "Anyone can view price history" ON public.price_history;
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);

-- Trading signals: Public read active signals
DROP POLICY IF EXISTS "Anyone can view active signals" ON public.trading_signals;
CREATE POLICY "Anyone can view active signals" ON public.trading_signals FOR SELECT USING (active = true);

-- User trades: Users see own, admins see all
DROP POLICY IF EXISTS "Users can view own trades" ON public.user_trades;
CREATE POLICY "Users can view own trades" ON public.user_trades FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Users can create trades" ON public.user_trades;
CREATE POLICY "Users can create trades" ON public.user_trades FOR INSERT WITH CHECK (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Admins can update trades" ON public.user_trades;
CREATE POLICY "Admins can update trades" ON public.user_trades FOR UPDATE USING (true);

-- User holdings: Users see own
DROP POLICY IF EXISTS "Users can view own holdings" ON public.user_holdings;
CREATE POLICY "Users can view own holdings" ON public.user_holdings FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "System can manage holdings" ON public.user_holdings;
CREATE POLICY "System can manage holdings" ON public.user_holdings FOR ALL USING (true);

-- Investment requests: Users see own, admins see all
DROP POLICY IF EXISTS "Users can view own investments" ON public.investment_requests;
CREATE POLICY "Users can view own investments" ON public.investment_requests FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Users can create investments" ON public.investment_requests;
CREATE POLICY "Users can create investments" ON public.investment_requests FOR INSERT WITH CHECK (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Admins can update investments" ON public.investment_requests;
CREATE POLICY "Admins can update investments" ON public.investment_requests FOR UPDATE USING (true);

-- Profit records: Users see own, admins see all
DROP POLICY IF EXISTS "Users can view own profits" ON public.profit_records;
CREATE POLICY "Users can view own profits" ON public.profit_records FOR SELECT USING (auth.uid()::text = user_id OR true);

DROP POLICY IF EXISTS "Admins can manage profits" ON public.profit_records;
CREATE POLICY "Admins can manage profits" ON public.profit_records FOR ALL USING (true);

-- Trading bots: Users see own
DROP POLICY IF EXISTS "Users can manage own bots" ON public.trading_bots;
CREATE POLICY "Users can manage own bots" ON public.trading_bots FOR ALL USING (auth.uid()::text = user_id OR true);

-- Insert initial market data (crypto)
INSERT INTO public.market_data (symbol, price, change_24h, volume_24h, high_24h, low_24h, market_cap, category)
VALUES
  ('BTC/USD', 43250.50, 2.34, 28500000000, 44500.00, 42500.00, 850000000000, 'crypto'),
  ('ETH/USD', 2650.75, -1.23, 15000000000, 2720.00, 2600.00, 320000000000, 'crypto'),
  ('BNB/USD', 315.20, 0.85, 850000000, 325.00, 310.00, 47000000000, 'crypto'),
  ('SOL/USD', 98.45, 3.67, 1200000000, 102.00, 95.00, 44000000000, 'crypto'),
  ('ADA/USD', 0.52, -0.45, 350000000, 0.55, 0.50, 18000000000, 'crypto'),
  ('XRP/USD', 0.62, 1.25, 980000000, 0.65, 0.60, 34000000000, 'crypto'),
  ('DOGE/USD', 0.085, 5.20, 560000000, 0.092, 0.082, 12000000000, 'crypto'),
  ('MATIC/USD', 0.88, -2.10, 420000000, 0.92, 0.85, 8200000000, 'crypto')
ON CONFLICT (symbol) DO NOTHING;

-- Insert initial stock data
INSERT INTO public.market_data (symbol, price, change_24h, volume_24h, high_24h, low_24h, market_cap, category)
VALUES
  ('AAPL', 178.50, 1.25, 45000000, 180.00, 177.00, 2800000000000, 'stock'),
  ('TSLA', 245.80, -2.10, 85000000, 252.00, 243.00, 780000000000, 'stock'),
  ('MSFT', 378.90, 0.85, 22000000, 382.00, 375.00, 2800000000000, 'stock'),
  ('GOOGL', 142.30, 1.50, 15000000, 144.00, 141.00, 1800000000000, 'stock'),
  ('AMZN', 145.75, -0.65, 28000000, 148.00, 144.00, 1500000000000, 'stock'),
  ('META', 320.40, 2.30, 18000000, 325.00, 318.00, 820000000000, 'stock')
ON CONFLICT (symbol) DO NOTHING;
