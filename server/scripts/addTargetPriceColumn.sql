-- Add target_price column to asset_transactions table
-- This column stores the target price set by the user when buying a stock

ALTER TABLE asset_transactions
ADD COLUMN IF NOT EXISTS target_price NUMERIC(15, 4) DEFAULT NULL;

-- Add comment to the column
COMMENT ON COLUMN asset_transactions.target_price IS 'The price level at which the user wants to be alerted for profit taking';

-- Create index for better query performance when checking target conditions
CREATE INDEX IF NOT EXISTS idx_asset_transactions_target 
ON asset_transactions(portfolio_id, ticker, target_price) 
WHERE target_price IS NOT NULL;
