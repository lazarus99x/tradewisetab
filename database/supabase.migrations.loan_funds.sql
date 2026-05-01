-- Additional tables for balances and admin approvals

create table if not exists public.user_balances (
  user_id text primary key,
  balance numeric(18,2) not null default 0,
  updated_at timestamptz default now()
);

-- Helper to adjust balance via positive/negative deltas
-- Use from app code by inserting into transactions and updating balance


