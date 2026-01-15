// server/controllers/dashboardController.js
const db = require('../config/db');

const getOverallDashboard = async (req, res) => {
    const userId = req.user.id;
    try {
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
        const overallAvgNav = (overallTotalUnits > 0) ? (overallTotalInvestment / overallTotalUnits) : 0;
        const overallCurrentNav = (overallTotalUnits > 0) ? (overallTotalValue / overallTotalUnits) : 0;

        res.json({
            stats: {
                currentValue: overallTotalValue,
                totalInvestment: overallTotalInvestment,
                absoluteGain: overallAbsoluteGain,
                gainPercentage: overallGainPercentage,
                avgNav: overallAvgNav,
                currentNav: overallCurrentNav
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
                let gainLossPercentage = 0;

                // Calculate average purchase price from BUY transactions
                if (holding.ticker !== 'CASH') {
                    const avgPriceRes = await db.query(
                        `SELECT SUM(quantity * price_per_share) / NULLIF(SUM(quantity), 0) AS avg_price
                         FROM asset_transactions
                         WHERE portfolio_id = $1 AND ticker = $2 AND transaction_type = 'BUY'`,
                        [portfolioId, holding.ticker]
                    );
                    if (avgPriceRes.rows.length > 0 && avgPriceRes.rows[0].avg_price) {
                        avgPurchasePrice = parseFloat(avgPriceRes.rows[0].avg_price);
                    }
                }

                // 1. If CASH
                if (holding.ticker === 'CASH') {
                    value = parseFloat(holding.quantity);
                    currentPrice = 0;
                    avgPurchasePrice = 0;
                    gainLossPercentage = 0;
                } 
                // 2. If MUTUAL FUND (numeric ticker)
                else if (/^\d+$/.test(holding.ticker)) {
                    const mfNameRes = await db.query('SELECT scheme_name FROM mutual_fund_schemes WHERE scheme_code = $1', [holding.ticker]);
                    if (mfNameRes.rows.length > 0) {
                        displayName = mfNameRes.rows[0].scheme_name.split(' - ')[0].substring(0, 20) + '...'; 
                    }
                    
                    // Get MF Price - Try EOD price first, fallback to transaction price
                    const priceRes = await db.query(
                        'SELECT closing_price, price_date FROM daily_prices WHERE ticker = $1 AND price_date <= $2 ORDER BY price_date DESC LIMIT 1',
                        [holding.ticker, currentDate]
                    );
                    
                    const txRes = await db.query(
                        'SELECT price_per_share, transaction_date FROM asset_transactions WHERE portfolio_id = $1 AND ticker = $2 ORDER BY transaction_date DESC LIMIT 1',
                        [portfolioId, holding.ticker]
                    );

                    let finalPrice = 0;
                    let dbPrice = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].closing_price) : 0;
                    let dbDateStr = priceRes.rows.length > 0 ? new Date(priceRes.rows[0].price_date).toISOString().split('T')[0] : '1970-01-01';
                    
                    let txPrice = txRes.rows.length > 0 ? parseFloat(txRes.rows[0].price_per_share) : 0;
                    let txDateStr = txRes.rows.length > 0 ? new Date(txRes.rows[0].transaction_date).toISOString().split('T')[0] : '1970-01-01';

                    // Use EOD price if available and newer, otherwise use transaction price
                    if (dbDateStr >= txDateStr && dbPrice > 0) {
                        finalPrice = dbPrice;
                    } else if (txPrice > 0) {
                        finalPrice = txPrice;
                    } else {
                        finalPrice = dbPrice;
                    }

                    currentPrice = finalPrice;
                    value = parseFloat(holding.quantity) * finalPrice;
                } 
                // 3. If STOCK (text ticker)
                else {
                    const tickerForPrice = holding.ticker.replace('.NS', '');
                    
                    // FIX: Smart Price Logic
                    // A. Get latest EOD price from DB
                    const priceRes = await db.query(
                        'SELECT closing_price, price_date FROM daily_prices WHERE ticker = $1 ORDER BY price_date DESC LIMIT 1',
                        [tickerForPrice]
                    );
                    
                    // B. Get latest transaction price for this asset
                    const txRes = await db.query(
                        'SELECT price_per_share, transaction_date FROM asset_transactions WHERE portfolio_id = $1 AND ticker = $2 ORDER BY transaction_date DESC LIMIT 1',
                        [portfolioId, holding.ticker]
                    );

                    let finalPrice = 0;
                    let dbPrice = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].closing_price) : 0;
                    let dbDateStr = priceRes.rows.length > 0 ? new Date(priceRes.rows[0].price_date).toISOString().split('T')[0] : '1970-01-01';
                    
                    let txPrice = txRes.rows.length > 0 ? parseFloat(txRes.rows[0].price_per_share) : 0;
                    let txDateStr = txRes.rows.length > 0 ? new Date(txRes.rows[0].transaction_date).toISOString().split('T')[0] : '1970-01-01';

                    // C. Use Tx Price if newer (or if today)
                    if (dbDateStr >= txDateStr && dbPrice > 0) {
                         finalPrice = dbPrice;
                    } else if (txPrice > 0) {
                         finalPrice = txPrice;
                    } else {
                         finalPrice = dbPrice;
                    }

                    currentPrice = finalPrice;
                    value = parseFloat(holding.quantity) * finalPrice;
                }

                // Calculate gain/loss percentage
                if (avgPurchasePrice > 0 && currentPrice > 0) {
                    gainLossPercentage = ((currentPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
                }

                // Get stop loss price for this holding (from most recent BUY transaction with stop loss)
                let stopLossPrice = null;
                let isStopLossTriggered = false;
                let targetPrice = null;
                let isTargetReached = false;
                
                if (holding.ticker !== 'CASH') {
                    const stopLossRes = await db.query(
                        `SELECT stop_loss_price FROM asset_transactions
                         WHERE portfolio_id = $1 AND ticker = $2 AND transaction_type = 'BUY' AND stop_loss_price IS NOT NULL
                         ORDER BY transaction_date DESC LIMIT 1`,
                        [portfolioId, holding.ticker]
                    );
                    if (stopLossRes.rows.length > 0 && stopLossRes.rows[0].stop_loss_price) {
                        stopLossPrice = parseFloat(stopLossRes.rows[0].stop_loss_price);
                        // Check if stop loss is triggered
                        if (currentPrice > 0 && currentPrice <= stopLossPrice) {
                            isStopLossTriggered = true;
                        }
                    }
                    
                    // Get target price
                    const targetRes = await db.query(
                        `SELECT target_price FROM asset_transactions
                         WHERE portfolio_id = $1 AND ticker = $2 AND transaction_type = 'BUY' AND target_price IS NOT NULL
                         ORDER BY transaction_date DESC LIMIT 1`,
                        [portfolioId, holding.ticker]
                    );
                    if (targetRes.rows.length > 0 && targetRes.rows[0].target_price) {
                        targetPrice = parseFloat(targetRes.rows[0].target_price);
                        // Check if target is reached
                        if (currentPrice > 0 && currentPrice >= targetPrice) {
                            isTargetReached = true;
                        }
                    }
                }

                holdingsWithValue.push({ 
                    name: displayName,
                    ticker: holding.ticker,
                    quantity: parseFloat(holding.quantity),
                    currentPrice: parseFloat(currentPrice.toFixed(2)),
                    avgPurchasePrice: parseFloat(avgPurchasePrice.toFixed(2)),
                    gainLossPercentage: parseFloat(gainLossPercentage.toFixed(2)),
                    value: parseFloat(value.toFixed(2)),
                    sector: null, // Will be populated below
                    stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice.toFixed(2)) : null,
                    isStopLossTriggered: isStopLossTriggered,
                    targetPrice: targetPrice ? parseFloat(targetPrice.toFixed(2)) : null,
                    isTargetReached: isTargetReached
                });
            }

            holdingsWithValue = holdingsWithValue.map((holding) => ({
                ...holding,
                percentage: totalPortfolioValue > 0 ? (holding.value / totalPortfolioValue) * 100 : 0,
            }));
            
            // Get sector information for stock holdings
            for (const holding of holdingsWithValue) {
                if (holding.ticker !== 'CASH' && !/^\d+$/.test(holding.ticker)) {
                    const cleanTicker = holding.ticker.replace('.NS', '');
                    const sectorRes = await db.query(
                        'SELECT sector FROM nse_symbols WHERE ticker = $1',
                        [cleanTicker]
                    );
                    if (sectorRes.rows.length > 0 && sectorRes.rows[0].sector) {
                        holding.sector = sectorRes.rows[0].sector;
                    }
                }
            }
        }
        
        // Calculate sector-wise allocation
        const sectorAllocation = {};
        for (const holding of holdingsWithValue) {
            let sectorName = 'Others';
            
            if (holding.ticker === 'CASH') {
                sectorName = 'Cash & Equivalents';
            } else if (/^\d+$/.test(holding.ticker)) {
                sectorName = 'Mutual Funds';
            } else if (holding.sector) {
                sectorName = holding.sector;
            }
            
            if (!sectorAllocation[sectorName]) {
                sectorAllocation[sectorName] = {
                    sector: sectorName,
                    value: 0,
                    holdings: []
                };
            }
            
            sectorAllocation[sectorName].value += holding.value;
            sectorAllocation[sectorName].holdings.push(holding);
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
            sectorAllocation: Object.values(sectorAllocation).map(sector => ({
                ...sector,
                percentage: totalPortfolioValue > 0 ? (sector.value / totalPortfolioValue) * 100 : 0
            })),
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