// server/controllers/dashboardController.js
const db = require('../config/db');

/**
 * @desc    Get overall dashboard data for all of an investor's portfolios
 * @route   GET /api/dashboard/overall
 */
const getOverallDashboard = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Get List of User's Portfolios
        const { rows: portfolioList } = await db.query(
            'SELECT id FROM portfolios WHERE user_id = $1', 
            [userId]
        );
        const portfolioIds = portfolioList.map(p => p.id);

        if (portfolioIds.length === 0) {
            return res.json({
                stats: { currentValue: 0, totalInvestment: 0, absoluteGain: 0, avgNav: 0, currentNav: 0 },
                portfolios: [],
                graphData: { overallNavHistory: [], overallLedgerHistory: [], nifty50History: [], nifty500History: [] }
            });
        }
        
        // 2. Run All Queries in Parallel
        const statsQuery = `
            WITH PortfolioStats AS (
                SELECT
                    p.id AS portfolio_id,
                    p.name,
                    p.created_at,
                    (SELECT nav.total_portfolio_value FROM nav_history nav WHERE nav.portfolio_id = p.id ORDER BY nav.nav_date DESC LIMIT 1) AS total_portfolio_value
                FROM portfolios p
                WHERE p.user_id = $1
            ),
            PortfolioInvestment AS (
                SELECT portfolio_id, COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE -amount END), 0) AS total_investment
                FROM units_ledger WHERE portfolio_id = ANY($2::int[]) GROUP BY portfolio_id
            ),
            PortfolioUnits AS (
                SELECT portfolio_id, COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units ELSE -units END), 0) AS total_units
                FROM units_ledger WHERE portfolio_id = ANY($2::int[]) GROUP BY portfolio_id
            )
            SELECT
                ps.portfolio_id, ps.name, ps.created_at,
                COALESCE(ps.total_portfolio_value, 0) AS "currentValue",
                COALESCE(pi.total_investment, 0) AS "totalInvestment",
                COALESCE(pu.total_units, 0) AS "totalUnits"
            FROM PortfolioStats ps
            LEFT JOIN PortfolioInvestment pi ON ps.portfolio_id = pi.portfolio_id
            LEFT JOIN PortfolioUnits pu ON ps.portfolio_id = pu.portfolio_id;
        `;
        
        const navHistoryPromise = db.query(
            `SELECT portfolio_id, nav_date, nav_value, total_portfolio_value, total_units_outstanding 
             FROM nav_history 
             WHERE portfolio_id = ANY($1::int[])
             ORDER BY nav_date ASC`,
            [portfolioIds]
        );
        
        const ledgerHistoryPromise = db.query(
            `SELECT portfolio_id, transaction_date, transaction_type, amount 
             FROM units_ledger 
             WHERE portfolio_id = ANY($1::int[])
             ORDER BY transaction_date ASC`,
            [portfolioIds]
        );
        
        const nifty50Promise = db.query(`SELECT price_date AS "date", closing_price AS "price" FROM index_history WHERE symbol = 'NIFTY50' ORDER BY price_date ASC`);
        const nifty500Promise = db.query(`SELECT price_date AS "date", closing_price AS "price" FROM index_history WHERE symbol = 'NIFTY500' ORDER BY price_date ASC`);

        const statsPromise = db.query(statsQuery, [userId, portfolioIds]);

        const [statsResult, navHistoryResult, ledgerHistoryResult, nifty50Result, nifty500Result] = await Promise.all([
            statsPromise, navHistoryPromise, ledgerHistoryPromise, nifty50Promise, nifty500Promise
        ]);

        // 3. Process Stats
        const portfolios = statsResult.rows;
        let overallTotalValue = 0;
        let overallTotalInvestment = 0;
        let overallTotalUnits = 0;

        const portfoliosWithAvgNav = portfolios.map(p => {
            const currentValue = parseFloat(p.currentValue);
            const totalInvestment = parseFloat(p.totalInvestment);
            const totalUnits = parseFloat(p.totalUnits);

            overallTotalValue += currentValue;
            overallTotalInvestment += totalInvestment;
            overallTotalUnits += totalUnits;

            const absoluteGain = currentValue - totalInvestment;
            const gainPercentage = (totalInvestment > 0) ? (absoluteGain / totalInvestment) * 100 : 0;

            return {
                ...p,
                currentValue: currentValue,
                totalInvestment: totalInvestment,
                totalUnits: totalUnits,
                avgNav: (totalUnits > 0) ? (totalInvestment / totalUnits) : 0,
                absoluteGain: absoluteGain,
                gainPercentage: gainPercentage,
            };
        });

        const overallAbsoluteGain = overallTotalValue - overallTotalInvestment;
        const overallGainPercentage = (overallTotalInvestment > 0) ? (overallAbsoluteGain / overallTotalInvestment) * 100 : 0;
        
        // --- NEW CALCULATIONS ---
        const overallAvgCostNav = (overallTotalUnits > 0) ? (overallTotalInvestment / overallTotalUnits) : 0;
        const overallCurrentNav = (overallTotalUnits > 0) ? (overallTotalValue / overallTotalUnits) : 0;

        res.json({
            stats: {
                currentValue: overallTotalValue,
                totalInvestment: overallTotalInvestment,
                absoluteGain: overallAbsoluteGain,
                gainPercentage: overallGainPercentage,
                avgNav: overallAvgCostNav, // Cost basis (10.0048)
                currentNav: overallCurrentNav // Market value (~10.34)
            },
            portfolios: portfoliosWithAvgNav,
            graphData: {
                overallNavHistory: navHistoryResult.rows,
                overallLedgerHistory: ledgerHistoryResult.rows,
                nifty50History: nifty50Result.rows,
                nifty500History: nifty500Result.rows,
            }
        });

    } catch (err) {
        console.error('DB Error in getOverallDashboard:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const getPortfolioDashboard = async (req, res) => {
    const portfolioId = req.params.id;
    const userId = req.user.id;

    try {
        const portfolioResult = await db.query('SELECT * FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        if (portfolioResult.rows.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or you are not the owner.' });
        }
        const navResult = await db.query('SELECT * FROM nav_history WHERE portfolio_id = $1 ORDER BY nav_date DESC LIMIT 1', [portfolioId]);
        const latestNav = navResult.rows.length > 0 ? navResult.rows[0] : null;
        const navHistoryResult = await db.query('SELECT nav_date, nav_value FROM nav_history WHERE portfolio_id = $1 ORDER BY nav_date ASC', [portfolioId]);
        const navHistory = navHistoryResult.rows;
        const ledgerSummaryResult = await db.query(
            `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE -amount END), 0) AS "totalInvestment",
                COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units ELSE -units END), 0) AS "totalUnits"
             FROM units_ledger WHERE portfolio_id = $1`, [portfolioId]
        );
        const { totalInvestment, totalUnits } = ledgerSummaryResult.rows[0];
        const avgNavValue = (totalUnits > 0) ? (totalInvestment / totalUnits) : 0;
        const totalPortfolioValue = latestNav ? parseFloat(latestNav.total_portfolio_value) : 0;
        const absoluteCapitalGain = totalPortfolioValue - totalInvestment;
        const absoluteCapitalPercentage = (totalInvestment > 0) ? (absoluteCapitalGain / totalInvestment) * 100 : 0;

        const holdingsResult = await db.query('SELECT * FROM master_holdings WHERE quantity > 0 AND portfolio_id = $1', [portfolioId]);
        const holdings = holdingsResult.rows;
        let holdingsWithValue = [];
        if (holdings.length > 0) {
            const currentDate = latestNav ? latestNav.nav_date : new Date().toISOString().split('T')[0];
            for (const holding of holdings) {
                let value = 0;
                let displayName = holding.ticker;
                let currentPrice = 0;
                let avgPurchasePrice = 0;
                
                if (holding.ticker === 'CASH') {
                    value = parseFloat(holding.quantity);
                    displayName = 'CASH';
                    currentPrice = 1;
                    avgPurchasePrice = 1;
                } else {
                    const tickerForPrice = holding.ticker.replace('.NS', '');
                    
                    // Check if it's a mutual fund (numeric ticker)
                    if (/^\d+$/.test(tickerForPrice)) {
                        // It's a mutual fund scheme code, fetch the scheme name
                        const schemeResult = await db.query(
                            'SELECT scheme_name FROM mutual_fund_schemes WHERE scheme_code = $1',
                            [tickerForPrice]
                        );
                        if (schemeResult.rows.length > 0) {
                            displayName = schemeResult.rows[0].scheme_name;
                        }
                    }
                    
                    // Calculate average purchase price from transactions
                    const avgPriceResult = await db.query(
                        `SELECT 
                            SUM(quantity * price_per_share) / NULLIF(SUM(quantity), 0) as avg_price
                        FROM asset_transactions 
                        WHERE ticker = $1 AND portfolio_id = $2 AND transaction_type = 'BUY'`,
                        [holding.ticker, portfolioId]
                    );
                    if (avgPriceResult.rows.length > 0 && avgPriceResult.rows[0].avg_price) {
                        avgPurchasePrice = parseFloat(avgPriceResult.rows[0].avg_price);
                    }
                    
                    // Try to get current price from daily_prices table
                    const priceResult = await db.query(
                        'SELECT closing_price FROM daily_prices WHERE ticker = $1 AND price_date <= $2 ORDER BY price_date DESC LIMIT 1',
                        [tickerForPrice, currentDate]
                    );
                    
                    if (priceResult.rows.length > 0) {
                        // Use the latest available price
                        currentPrice = parseFloat(priceResult.rows[0].closing_price);
                        value = parseFloat(holding.quantity) * currentPrice;
                    } else {
                        // Fallback: If no price found, use the most recent transaction price for this ticker
                        const lastTransactionPrice = await db.query(
                            'SELECT price_per_share FROM asset_transactions WHERE ticker = $1 AND portfolio_id = $2 ORDER BY transaction_date DESC, id DESC LIMIT 1',
                            [holding.ticker, portfolioId]
                        );
                        if (lastTransactionPrice.rows.length > 0) {
                            currentPrice = parseFloat(lastTransactionPrice.rows[0].price_per_share);
                            value = parseFloat(holding.quantity) * currentPrice;
                        }
                    }
                }
                
                // Calculate gain/loss percentage
                let gainLossPercentage = 0;
                if (avgPurchasePrice > 0 && currentPrice > 0) {
                    gainLossPercentage = ((currentPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
                }
                
                holdingsWithValue.push({ 
                    name: displayName, 
                    ticker: holding.ticker, // Keep the original ticker for lookups
                    value: parseFloat(value.toFixed(2)),
                    currentPrice: parseFloat(currentPrice.toFixed(2)),
                    avgPurchasePrice: parseFloat(avgPurchasePrice.toFixed(2)),
                    gainLossPercentage: parseFloat(gainLossPercentage.toFixed(2)),
                    quantity: parseFloat(holding.quantity)
                });
            }
            holdingsWithValue = holdingsWithValue.map((holding) => ({
                ...holding,
                percentage: totalPortfolioValue > 0 ? (holding.value / totalPortfolioValue) * 100 : 0,
            }));
        }

        const niftyHistoryResult = await db.query(`SELECT price_date AS "date", closing_price AS "price" FROM index_history WHERE symbol = 'NIFTY50' ORDER BY price_date ASC`);
        const nifty500HistoryResult = await db.query(`SELECT price_date AS "date", closing_price AS "price" FROM index_history WHERE symbol = 'NIFTY500' ORDER BY price_date ASC`);
        
        const response = {
            portfolioName: portfolioResult.rows[0].name,
            latestNav: latestNav ? parseFloat(latestNav.nav_value) : 10,
            avgNav: avgNavValue,
            totalPortfolioValue: totalPortfolioValue, 
            totalInvestment: parseFloat(totalInvestment),
            absoluteCapitalGain: parseFloat(absoluteCapitalGain),
            absoluteCapitalPercentage: parseFloat(absoluteCapitalPercentage),
            totalUnits: parseFloat(totalUnits),
            holdings: holdingsWithValue,
            navHistory: navHistory,
            niftyHistory: niftyHistoryResult.rows,
            nifty500History: nifty500HistoryResult.rows,
        };
        res.json(response);
    } catch (err) {
        console.error('❌ DB Error in getPortfolioDashboard:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

module.exports = { getOverallDashboard, getPortfolioDashboard };