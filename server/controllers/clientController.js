const db = require('../config/db');

const getAllClients = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clients ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('DB Error in getAllClients:', err.message);
    res.status(500).send('Server Error');
  }
};

const createClient = async (req, res) => {
  const { name, email } = req.body;
  try {
    const sql = 'INSERT INTO clients (name, email) VALUES ($1, $2) RETURNING *';
    const { rows } = await db.query(sql, [name, email]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error in createClient:', err.message);
    res.status(500).send('Server Error');
  }
};

const clientDeposit = async (req, res) => {
  const { clientId, amount } = req.body;
  
  try {
    await db.query('BEGIN'); 

    const lastNavResult = await db.query('SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1');
    let latestNAV = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].nav_value) : 10.0;
    
    const newUnits = parseFloat(amount) / latestNAV;
    
    await db.query('INSERT INTO units_ledger (client_id, transaction_type, amount, units) VALUES ($1, \'DEPOSIT\', $2, $3) RETURNING *', [clientId, amount, newUnits]);
    
    await db.query(`
        INSERT INTO master_holdings (ticker, quantity) VALUES ('CASH', $1)
        ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $1
    `, [amount]);

    await db.query('COMMIT');
    res.status(201).json({ message: "Deposit successful" });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DB Error in clientDeposit:', err.message);
    res.status(500).send('Server Error: Transaction rolled back.');
  }
};

const clientWithdrawal = async (req, res) => {
  const { clientId, amount } = req.body;
 
  try {
    await db.query('BEGIN'); 
    const lastNavResult = await db.query('SELECT nav_value FROM nav_history ORDER BY nav_date DESC LIMIT 1');

    if (lastNavResult.rows.length === 0) {
      throw new Error('No NAV history found. Cannot process withdrawal.');
    }

    const latestNAV = parseFloat(lastNavResult.rows[0].nav_value);
    const unitsToRedeem = parseFloat(amount) / latestNAV;

    await db.query('INSERT INTO units_ledger (client_id, transaction_type, amount, units) VALUES ($1, \'WITHDRAWAL\', $2, $3) RETURNING *', [clientId, amount, unitsToRedeem]);
    
    await db.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\'', [amount]);

    await db.query('COMMIT');
    res.status(201).json({ message: "Withdrawal successful" });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DB Error in clientWithdrawal:', err.message);
    res.status(500).send('Server Error: Transaction rolled back.');
  }
};

const getClientById = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ msg: 'Invalid Client ID' });
    }

    const clientResult = await db.query('SELECT id, name, email FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    const clientDetails = clientResult.rows[0];

    const ledgerResult = await db.query(
      'SELECT * FROM units_ledger WHERE client_id = $1 ORDER BY transaction_date DESC',
      [clientId]
    );
    const transactionHistory = ledgerResult.rows;

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
  getClientById
};