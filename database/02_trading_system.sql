-- 02_trading_system.sql
-- Market data, trades, and signals

-- 1. Market Data: current prices
CREATE TABLE IF NOT EXISTS public.market_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price NUMERIC(20, 8) NOT NULL,
  change_24h NUMERIC(10, 4) DEFAULT 0,
  volume_24h NUMERIC(20, 2) DEFAULT 0,
  category TEXT DEFAULT 'crypto', -- 'crypto', 'stock', 'forex'
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Trades: active and historical orders
CREATE TABLE IF NOT EXISTS public.user_trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  amount NUMERIC(20, 8) NOT NULL, -- Units
  price NUMERIC(20, 8) NOT NULL, -- Price at execution
  total_value NUMERIC(20, 2) NOT NULL, -- USD value
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  profit_loss NUMERIC(20, 2) DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_trades_user_id_idx ON public.user_trades(user_id, created_at DESC);

-- 3. Price History: for charts
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_symbol_idx ON public.price_history(symbol, timestamp DESC);

-- 4. Trading Signals: AI generated suggestions
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
  strength TEXT DEFAULT 'MEDIUM',
  entry_price NUMERIC(20, 8),
  target_price NUMERIC(20, 8),
  stop_loss NUMERIC(20, 8),
  reasoning TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
