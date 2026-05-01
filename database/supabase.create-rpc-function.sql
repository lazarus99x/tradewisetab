-- Create the update_user_balance RPC function if it doesn't exist
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id TEXT,
    p_account_delta NUMERIC DEFAULT 0,
    p_profit_delta NUMERIC DEFAULT 0,
    p_loss_delta NUMERIC DEFAULT 0,
    p_funding_delta NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    -- Update user_balances table
    UPDATE public.user_balances
    SET 
        account_balance = account_balance + p_account_delta,
        profit_balance = profit_balance + p_profit_delta,
        loss_balance = loss_balance + p_loss_delta,
        funding_balance = funding_balance + p_funding_delta,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no rows were updated, create a new record
    IF NOT FOUND THEN
        INSERT INTO public.user_balances (
            user_id,
            account_balance,
            profit_balance,
            loss_balance,
            funding_balance,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_account_delta,
            p_profit_delta,
            p_loss_delta,
            p_funding_delta,
            NOW(),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
