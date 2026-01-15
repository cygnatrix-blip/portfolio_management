-- Add sector and industry columns to nse_symbols table
-- This enables sector-based portfolio analysis

ALTER TABLE nse_symbols 
ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS industry VARCHAR(200);

-- Create index for faster sector queries
CREATE INDEX IF NOT EXISTS idx_nse_symbols_sector ON nse_symbols(sector);

-- Add comment for documentation
COMMENT ON COLUMN nse_symbols.sector IS 'NSE sector classification (e.g., Financial Services, IT, Pharma)';
COMMENT ON COLUMN nse_symbols.industry IS 'NSE industry sub-classification';

-- Example: Update some common stocks (you can add more)
-- These will be populated automatically by the NSE sector master file download
