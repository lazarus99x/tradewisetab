-- 05_seed_data.sql
-- Initial data for assets and wallets

-- 1. Initial Market Data (Crypto)
INSERT INTO public.market_data (symbol, price, change_24h, category)
VALUES
  ('BTC/USD', 43250.50, 2.34, 'crypto'),
  ('ETH/USD', 2650.75, -1.23, 'crypto'),
  ('BNB/USD', 315.20, 0.85, 'crypto'),
  ('SOL/USD', 98.45, 3.67, 'crypto'),
  ('ADA/USD', 0.52, -0.45, 'crypto'),
  ('XRP/USD', 0.62, 1.25, 'crypto'),
  ('MATIC/USD', 0.88, -2.10, 'crypto')
ON CONFLICT (symbol) DO NOTHING;

-- 2. Initial Market Data (Stocks)
INSERT INTO public.market_data (symbol, price, change_24h, category)
VALUES
  ('AAPL', 178.50, 1.25, 'stock'),
  ('TSLA', 245.80, -2.10, 'stock'),
  ('MSFT', 378.90, 0.85, 'stock'),
  ('GOOGL', 142.30, 1.50, 'stock')
ON CONFLICT (symbol) DO NOTHING;

-- 3. Sample Admin Wallets
INSERT INTO public.wallet_addresses (currency, address, network, icon_url)
VALUES
  ('BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bitcoin Mainnet', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'),
  ('ETH', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum (ERC20)', 'https://cryptologos.cc/logos/ethereum-eth-logo.png'),
  ('USDT', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum (ERC20)', 'https://cryptologos.cc/logos/tether-usdt-logo.png')
ON CONFLICT DO NOTHING;
