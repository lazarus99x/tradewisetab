# Live Trading System Setup Guide

## Overview

This system includes:

- **Live Trading Dashboard** with animated, real-time price charts
- **AI Trading Signals Bot** that generates buy/sell signals
- **Automated Trading** - users can activate bots that trade on signals
- **Stock Investment System** - users can request stock purchases
- **Admin Approval Workflow** - all trades and investments require admin approval
- **Profit Management** - admin can approve profits to user accounts

## Database Setup

1. **Run the main schema script:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase.trading-system-schema.sql
   ```
   This creates:
   - `market_data` - Current prices for crypto and stocks
   - `price_history` - Historical price data for charts
   - `trading_signals` - AI-generated trading signals
   - `user_trades` - User trade requests
   - `user_holdings` - User portfolio holdings
   - `investment_requests` - Stock investment requests
   - `profit_records` - Profit/loss records for approval
   - `trading_bots` - Automated trading bot configurations

## Market Simulator Setup

**No setup needed!** The market simulator runs automatically in the browser when users visit the dashboard.

- Market prices update every 5 seconds
- AI signals generate every 30 seconds
- All happens client-side using JavaScript
- No external scripts or cron jobs needed

## Features

### User Dashboard (`/dashboard`)

1. **Live Asset Selector** - View all crypto and stocks with real-time prices
2. **Live Trading Chart** - Animated chart that updates in real-time
3. **Order Panel** - Place buy/sell orders (requires admin approval)
4. **AI Signals Bot** - View and enable automated trading on AI signals
5. **Investment Form** - Request stock investments

### Admin Pages

1. **Trades** (`/admin/trades`)

   - View all trade requests
   - Approve/Reject trades
   - Automatically deducts balance on approval
   - Updates user holdings

2. **Investments** (`/admin/investments`)

   - View stock investment requests
   - Approve with custom amount/shares
   - Updates user holdings

3. **Profits** (`/admin/profits`)
   - View profit records from trades
   - Approve profits to add to user balance
   - Tracks profit percentages

## How It Works

### Trading Flow:

1. User selects asset and places buy/sell order
2. Order is created with status "pending" in `user_trades`
3. Admin reviews order in `/admin/trades`
4. On approval:
   - **BUY**: Deducts balance, adds to holdings
   - **SELL**: Removes from holdings, adds to balance, creates profit record
5. User sees updated balance and holdings instantly

### Investment Flow:

1. User submits stock investment request
2. Request created in `investment_requests` with status "pending"
3. Admin reviews in `/admin/investments`
4. Admin can approve with custom amount/shares (may differ from request)
5. Balance deducted, holdings updated

### Profit Flow:

1. When a sell order is executed, profit is calculated
2. Profit record created in `profit_records` with status "pending"
3. Admin reviews in `/admin/profits`
4. On approval, profit added to user's account balance and profit balance

### AI Signals:

1. API endpoint `/api/generate-signals` analyzes market data
2. Generates BUY/SELL/HOLD signals based on 24h price movement
3. Signals displayed in dashboard
4. Users can activate trading bots to automatically trade on signals

## Real-Time Updates

All components use Supabase real-time subscriptions:

- Prices update live on charts
- Orders reflect status changes instantly
- Balance updates in real-time
- Signals appear as they're generated

## Market Data Initialization

The schema script includes initial data for:

- **Crypto**: BTC, ETH, BNB, SOL, ADA, XRP, DOGE, MATIC
- **Stocks**: AAPL, TSLA, MSFT, GOOGL, AMZN, META

Prices will start from base values and simulate realistic movements.

## Important Notes

1. **All trades require admin approval** - Users cannot execute trades directly
2. **Balance is debited on approval** - Ensure users have sufficient balance
3. **Profit approval is separate** - Admins manually approve profits
4. **Market simulator should run continuously** - For best experience, keep it running

## Environment Variables

Ensure these are set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for API routes)

## Troubleshooting

**Prices not updating?**

- Check if market simulator is running
- Verify API route is accessible
- Check Supabase real-time subscriptions

**Trades not showing?**

- Check RLS policies are correct
- Verify user is authenticated
- Check database tables exist

**Charts not animating?**

- Ensure price_history has data
- Check real-time subscriptions are active
- Verify asset symbol matches market_data

## Next Steps

1. Run the database schema script
2. Start the market simulator
3. Generate initial signals
4. Test with a user account
5. Approve test trades from admin panel

Enjoy your live trading system! 🚀📈
