# LeverFi Platform - Database Setup Guide

Follow these steps to replicate the database environment on a new Supabase project.

## 1. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to the **SQL Editor**.
3. Run the following scripts in order:

### Execution Order
1. **[01_master_schema.sql](database/01_master_schema.sql)**: Creates core tables (Profiles, Balances, Transactions, Wallets).
2. **[02_trading_system.sql](database/02_trading_system.sql)**: Creates market data and trade tables.
3. **[03_funding_and_kyc.sql](database/03_funding_and_kyc.sql)**: Creates KYC and Funding application tables.
4. **[04_storage_and_security.sql](database/04_storage_and_security.sql)**: Initializes storage buckets and security policies.
5. **[05_seed_data.sql](database/05_seed_data.sql)**: Populates initial assets and wallet addresses.

## 2. Environment Variables
Ensure your `.env.local` file contains the following keys from your Supabase Project Settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (CRITICAL for admin actions)
```

## 3. Storage Configuration
The scripts in step 4 will automatically create the following buckets:
- `kyc`: Private (documents only viewable by admin).
- `deposit-proofs`: Public (proof images viewable in admin panel).
- `funding-images`: Public.

## 4. Troubleshooting
- **PGRST116 Error**: This usually happens if you try to fetch a row that doesn't exist yet. Ensure you've run the seed data or that the user has a profile.
- **23503 Foreign Key Violation**: Ensure you run the scripts in the correct order (01 before 02/03).
- **Broken Images**: Check that the buckets are set to `Public` in the Supabase Storage dashboard.

---
*Created by Antigravity AI*
