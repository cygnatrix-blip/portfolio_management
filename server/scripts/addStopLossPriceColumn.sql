-- Add stop_loss_price column to asset_transactions table
-- This column stores the stop loss price set by the user when buying a stock

ALTER TABLE asset_transactions
ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC(15, 4) DEFAULT NULL;

-- Add comment to the column
COMMENT ON COLUMN asset_transactions.stop_loss_price IS 'The price level at which the user wants to be alerted for this position';

-- Create index for better query performance when checking stop loss conditions
CREATE INDEX IF NOT EXISTS idx_asset_transactions_stop_loss 
ON asset_transactions(portfolio_id, ticker, stop_loss_price) 
WHERE stop_loss_price IS NOT NULL;
