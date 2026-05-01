-- Complete Supabase schema for LeverFi platform
-- Run this in Supabase SQL editor to update existing tables

-- Extensions
create extension if not exists "uuid-ossp";

-- Storage bucket for funding images
insert into storage.buckets (id, name, public)
values ('funding-images', 'funding-images', true)
on conflict (id) do nothing;

-- Enhanced user_balances table
create table if not exists public.user_balances (
  user_id text primary key,
  account_balance numeric(18,2) not null default 0,
  profit_balance numeric(18,2) not null default 0,
  loss_balance numeric(18,2) not null default 0,
  funding_balance numeric(18,2) not null default 0,
  updated_at timestamptz default now()
);

-- Enhanced transactions table
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  type text not null check (type in (
    'deposit','withdrawal','loan_disbursal','fee','profit','loss','funding_approval','funding_rejection'
  )),
  amount numeric(18,2) not null,
  description text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Funding options (renamed from loans)
create table if not exists public.funding_options (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  amount numeric(18,2) not null,
  interest_rate numeric(6,3) not null,
  duration_days int not null,
  image_url text,
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now()
);

-- Rename existing loans table to funding_options (migration)
-- ALTER TABLE public.loans RENAME TO funding_options_old;
-- INSERT INTO public.funding_options (id, title, amount, interest_rate, duration_days, status, created_at)
-- SELECT id, COALESCE(title, 'Funding Option'), amount, interest_rate, duration_days, status, created_at FROM public.loans;

-- Update loan_applications to reference funding_options
-- ALTER TABLE public.loan_applications RENAME COLUMN loan_id TO funding_option_id;

-- Indexes for performance
create index if not exists transactions_user_idx on public.transactions(user_id);
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists funding_applications_user_idx on public.loan_applications(user_id);
create index if not exists funding_applications_option_idx on public.loan_applications(loan_id);

-- Disable RLS for development (enable for production)
alter table public.user_balances disable row level security;
alter table public.transactions disable row level security;
alter table public.funding_options disable row level security;

-- Helper function to update balances
create or replace function update_user_balance(
  p_user_id text,
  p_account_delta numeric default 0,
  p_profit_delta numeric default 0,
  p_loss_delta numeric default 0,
  p_funding_delta numeric default 0
) returns void as $$
begin
  insert into public.user_balances (user_id, account_balance, profit_balance, loss_balance, funding_balance)
  values (p_user_id, p_account_delta, p_profit_delta, p_loss_delta, p_funding_delta)
  on conflict (user_id) do update set
    account_balance = user_balances.account_balance + p_account_delta,
    profit_balance = user_balances.profit_balance + p_profit_delta,
    loss_balance = user_balances.loss_balance + p_loss_delta,
    funding_balance = user_balances.funding_balance + p_funding_delta,
    updated_at = now();
end;
$$ language plpgsql;
