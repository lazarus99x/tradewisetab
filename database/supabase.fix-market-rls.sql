-- Fix RLS policies to allow the client-side market-updater to update prices
-- Warning: In a production app, market updates should run on a secure backend!

-- Allow anyone to update/insert market data (required for client-side simulator)
DROP POLICY IF EXISTS "System can manage market data" ON public.market_data;
CREATE POLICY "System can manage market data" ON public.market_data FOR ALL USING (true);

-- Ensure price_history has an insert policy
DROP POLICY IF EXISTS "System can manage price history" ON public.price_history;
CREATE POLICY "System can manage price history" ON public.price_history FOR ALL USING (true);

-- Forcefully reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
