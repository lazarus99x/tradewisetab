-- Run this in Supabase SQL editor. Simple, functional schema for LeverFi MVP.
-- Notes:
-- - RLS is DISABLED for simplicity so anon client can read/write during development.
-- - Replace with proper RLS policies before production.

-- Extensions (ensure uuid generation available)
create extension if not exists "uuid-ossp";

-- Storage bucket for KYC documents (private)
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Profiles: one row per Clerk user
create table if not exists public.profiles (
  user_id text primary key, -- Clerk user id (e.g., user_...)
  email text,
  full_name text,
  phone text,
  avatar_url text,
  kyc_status text default 'pending' check (kyc_status in ('pending','verified','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- KYC submissions: most recent row is the active review item
create table if not exists public.kyc_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  status text default 'pending' check (status in ('pending','verified','rejected')),
  reason text,
  documents jsonb, -- { id_front, id_back, selfie, address_proof, credit_report }
  created_at timestamptz default now()
);
create index if not exists kyc_submissions_user_id_idx on public.kyc_submissions(user_id);

-- Announcements broadcasted to users
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Loan offers created by admin
create table if not exists public.loans (
  id uuid primary key default uuid_generate_v4(),
  title text,
  amount numeric(18,2) not null,
  interest_rate numeric(6,3) not null, -- % APR
  duration_days int not null,
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now()
);

-- User applications to loan offers
create table if not exists public.loan_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  created_at timestamptz default now()
);
create index if not exists loan_applications_user_idx on public.loan_applications(user_id);
create index if not exists loan_applications_loan_idx on public.loan_applications(loan_id);

-- Basic ledger for balances/PL
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  type text not null check (type in (
    'deposit','withdrawal','loan_disbursal','fee','profit','loss'
  )),
  amount numeric(18,2) not null,
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id);

-- DEV ONLY: disable RLS for quick iteration
alter table public.profiles disable row level security;
alter table public.kyc_submissions disable row level security;
alter table public.announcements disable row level security;
alter table public.loans disable row level security;
alter table public.loan_applications disable row level security;
alter table public.transactions disable row level security;

-- Helper view: latest KYC status per user
create or replace view public.latest_kyc as
select distinct on (user_id)
  user_id,
  id as kyc_id,
  status,
  reason,
  documents,
  created_at
from public.kyc_submissions
order by user_id, created_at desc;


