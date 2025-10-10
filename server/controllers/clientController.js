const db = require('../config/db');

// @desc    Get all clients
// @route   GET /api/clients
const getAllClients = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clients ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('DB Error in getAllClients:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new client
// @route   POST /api/clients
const createClient = async (req, res) => {
  const { name, email } = req.body;
  try {
    // This function is for the admin to create clients without a password
    // The authController.registerClient is for clients to sign themselves up
    const sql = 'INSERT INTO clients (name, email) VALUES ($1, $2) RETURNING *';
    const { rows } = await db.query(sql, [name, email]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error in createClient:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Log a new deposit for a client
// @route   POST /api/clients/deposit
const clientDeposit = async (req, res) => {
  const { clientId, amount } = req.body;
  
  const client = await db.query('BEGIN'); // Start a database transaction

  try {
    // 1. Get the latest NAV. If no NAV exists, set it to 10.
    let latestNAV = 10.00;
    let totalUnitsOutstanding = 0;
    let totalPortfolioValue = 0;

    const lastNavResult = await db.query(
      'SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1'
    );

    if (lastNavResult.rows.length > 0) {
      latestNAV = parseFloat(lastNavResult.rows[0].nav_value);
      totalUnitsOutstanding = parseFloat(lastNavResult.rows[0].total_units_outstanding);
      totalPortfolioValue = parseFloat(lastNavResult.rows[0].total_portfolio_value);
    }

    // 2. Calculate new units for this deposit
    const newUnits = parseFloat(amount) / latestNAV;
    const newTotalUnits = totalUnitsOutstanding + newUnits;
    const newTotalValue = totalPortfolioValue + parseFloat(amount);

    // 3. Log this client's transaction
    const ledgerSql = `
      INSERT INTO units_ledger (client_id, transaction_type, amount, units)
      VALUES ($1, 'DEPOSIT', $2, $3) RETURNING *
    `;
    await db.query(ledgerSql, [clientId, amount, newUnits]);

    // 4. Save the new system-wide NAV totals
    const navSql = `
      INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
      VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (nav_date) DO UPDATE SET
        nav_value = $1,
        total_portfolio_value = $2,
        total_units_outstanding = $3
      RETURNING *;
    `;
    const { rows } = await db.query(navSql, [latestNAV, newTotalValue, newTotalUnits]);

    await db.query('COMMIT');
    res.status(201).json(rows[0]);

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DB Error in clientDeposit:', err.message);
    res.status(500).send('Server Error: Transaction rolled back.');
  }
};

// @desc    Log a new withdrawal for a client
// @route   POST /api/clients/withdraw
const clientWithdrawal = async (req, res) => {
  const { clientId, amount } = req.body;
  
  const client = await db.query('BEGIN'); 

  try {
    // 1. Get the latest NAV for calculations.
    const lastNavResult = await db.query(
      'SELECT nav_value, total_units_outstanding, total_portfolio_value FROM nav_history ORDER BY nav_date DESC LIMIT 1'
    );

    if (lastNavResult.rows.length === 0) {
      throw new Error('No NAV history found. Cannot process withdrawal.');
    }

    const latestNAV = parseFloat(lastNavResult.rows[0].nav_value);
    const totalUnitsOutstanding = parseFloat(lastNavResult.rows[0].total_units_outstanding);
    const totalPortfolioValue = parseFloat(lastNavResult.rows[0].total_portfolio_value);

    // 2. Calculate units to redeem
    const unitsToRedeem = parseFloat(amount) / latestNAV;

    // 3. Update system totals
    const newTotalUnits = totalUnitsOutstanding - unitsToRedeem;
    const newTotalValue = totalPortfolioValue - parseFloat(amount);

    // 4. Log the withdrawal in the ledger
    const ledgerSql = `
      INSERT INTO units_ledger (client_id, transaction_type, amount, units)
      VALUES ($1, 'WITHDRAWAL', $2, $3) RETURNING *
    `;
    await db.query(ledgerSql, [clientId, amount, unitsToRedeem]);

    // 5. Save the new system-wide NAV totals for today
    const navSql = `
      INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
      VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (nav_date) DO UPDATE SET
        nav_value = $1,
        total_portfolio_value = $2,
        total_units_outstanding = $3
      RETURNING *;
    `;
    const { rows } = await db.query(navSql, [latestNAV, newTotalValue, newTotalUnits]);

    await db.query('COMMIT');
    res.status(201).json(rows[0]);

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DB Error in clientWithdrawal:', err.message);
    res.status(500).send('Server Error: Transaction rolled back.');
  }
};

// @desc    Get a single client's details and transaction history
// @route   GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ msg: 'Invalid Client ID' });
    }

    // 1. Get client's personal details
    const clientResult = await db.query('SELECT id, name, email FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    const clientDetails = clientResult.rows[0];

    // 2. Get client's transaction history
    const ledgerResult = await db.query(
      'SELECT * FROM units_ledger WHERE client_id = $1 ORDER BY transaction_date DESC',
      [clientId]
    );
    const transactionHistory = ledgerResult.rows;

    // 3. Send both pieces of data back in one response
    res.json({
      details: clientDetails,
      history: transactionHistory,
    });

  } catch (err) {
    console.error('DB Error in getClientById:', err.message);
    res.status(500).send('Server Error');
  }
};


module.exports = {
  getAllClients,
  createClient,
  clientDeposit,
  clientWithdrawal,
  getClientById // Export the new function
};

