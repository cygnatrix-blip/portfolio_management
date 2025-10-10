const db = require('../config/db');

// @desc    Get all data for the admin dashboard
// @route   GET /api/dashboard
const getDashboardData = async (req, res) => {
    try {
        // --- All existing queries remain the same ---
        const navResult = await db.query('SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1');
        const latestNav = navResult.rows.length > 0 ? navResult.rows[0] : null;

        const navHistoryResult = await db.query('SELECT nav_date, nav_value FROM nav_history ORDER BY nav_date ASC');
        const navHistory = navHistoryResult.rows;
        
        const holdingsResult = await db.query('SELECT * FROM master_holdings WHERE quantity > 0');
        const holdings = holdingsResult.rows;
        let holdingsWithValue = [];
        if(latestNav && holdings.length > 0) {
            for (const holding of holdings) {
                let value = 0;
                if (holding.ticker === 'CASH') {
                    value = parseFloat(holding.quantity);
                } else {
                    const priceResult = await db.query(
                        'SELECT closing_price FROM daily_prices WHERE ticker = $1 AND price_date <= $2 ORDER BY price_date DESC LIMIT 1', 
                        [holding.ticker, latestNav.nav_date]
                    );
                    if (priceResult.rows.length > 0) {
                        value = parseFloat(holding.quantity) * parseFloat(priceResult.rows[0].closing_price);
                    }
                }
                holdingsWithValue.push({ name: holding.ticker, value: parseFloat(value.toFixed(2)) });
            }
        }

        const clientsResult = await db.query('SELECT * FROM clients ORDER BY name');
        const clients = clientsResult.rows;
        const ledgerResult = await db.query('SELECT * FROM units_ledger');
        const ledgerEntries = ledgerResult.rows;
        const clientUnitHoldings = {};
        for (const entry of ledgerEntries) {
            const clientId = entry.client_id;
            const units = parseFloat(entry.units);
            if (!clientUnitHoldings[clientId]) clientUnitHoldings[clientId] = 0;
            if (entry.transaction_type === 'DEPOSIT') clientUnitHoldings[clientId] += units;
            else if (entry.transaction_type === 'WITHDRAWAL') clientUnitHoldings[clientId] -= units;
        }
        const clientsWithDetails = clients.map(client => {
            const totalUnits = clientUnitHoldings[client.id] || 0;
            const currentValue = latestNav ? totalUnits * parseFloat(latestNav.nav_value) : 0;
            return { ...client, totalUnits, currentValue };
        });

        // --- NEW: Fetch the 25 most recent asset transactions ---
        const assetTransactionsResult = await db.query(
            'SELECT * FROM asset_transactions ORDER BY transaction_date DESC LIMIT 25'
        );

        // --- Consolidate all data into a single response ---
        res.json({
            latestNav,
            clients: clientsWithDetails,
            holdings: holdingsWithValue,
            navHistory: navHistory,
            assetTransactions: assetTransactionsResult.rows, // <-- Add the new data here
        });

    } catch (err) {
        console.error('DB Error in getDashboardData:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDashboardData,
};