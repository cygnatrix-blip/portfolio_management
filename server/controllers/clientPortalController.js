const db = require('../config/db');

// @desc    Get the logged-in client's dashboard data
// @route   GET /api/portal/me
const getMyDashboard = async (req, res) => {
  try {
    // The client ID comes from the authMiddleware
    const clientId = req.client.id;

    // 1. Get the most recent NAV record
    const navResult = await db.query(
      'SELECT nav_value FROM nav_history ORDER BY nav_date DESC LIMIT 1'
    );
    const latestNav = navResult.rows.length > 0 ? parseFloat(navResult.rows[0].nav_value) : 10;

    // 2. Get client's name
    const clientResult = await db.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const clientName = clientResult.rows.length > 0 ? clientResult.rows[0].name : 'Client';

    // 3. Get all transactions for THIS client, sorted oldest to newest for XIRR
    const ledgerResult = await db.query(
      'SELECT transaction_type, units, amount, transaction_date FROM units_ledger WHERE client_id = $1 ORDER BY transaction_date ASC',
      [clientId]
    );
    const transactionHistory = ledgerResult.rows;

    // --- NEW ---
    // 4. Get the entire NAV history for the performance chart
    const navHistoryResult = await db.query('SELECT nav_date, nav_value FROM nav_history ORDER BY nav_date ASC');
    const navHistory = navHistoryResult.rows;

    // 5. Calculate client's current total units
    let totalUnits = 0;
    transactionHistory.forEach(t => {
      if (t.transaction_type === 'DEPOSIT') {
        totalUnits += parseFloat(t.units);
      } else if (t.transaction_type === 'WITHDRAWAL') {
        totalUnits -= parseFloat(t.units);
      }
    });

    // 6. Calculate client's current portfolio value
    const currentValue = totalUnits * latestNav;

    // 7. Send all personalized data back, now including the navHistory
    res.json({
      clientName,
      totalUnits,
      currentValue,
      latestNav,
      transactionHistory,
      navHistory // <-- ADDED THIS to the response
    });

  } catch (err) {
    console.error('DB Error in getMyDashboard:', err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { getMyDashboard };
