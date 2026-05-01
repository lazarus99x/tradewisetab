-- 1. Add missing columns to wallet_addresses safely
ALTER TABLE public.wallet_addresses 
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Drop the restrictive UNIQUE constraint on (currency, active)
-- We use a DO block to catch and ignore if the constraint doesn't exist
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.wallet_addresses'::regclass
      AND contype = 'u'; -- Unique constraints
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.wallet_addresses DROP CONSTRAINT IF EXISTS "' || constraint_name || '"';
    END IF;
END $$;

-- 3. Alternatively, explicitly try dropping the most common names for this constraint
ALTER TABLE public.wallet_addresses DROP CONSTRAINT IF EXISTS wallet_addresses_currency_active_key;

-- 4. Reload the PostgREST schema cache so your API immediately recognizes the 'active' column
NOTIFY pgrst, 'reload schema';
