const db = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Admin creates a new client with a password
// @route   POST /api/admin/users
const adminCreateClient = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await db.query('SELECT * FROM clients WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'Client with that email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = 'INSERT INTO clients (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email';
    const { rows } = await db.query(sql, [name, email, hashedPassword]);
    
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('DB Error in adminCreateClient:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Admin resets a client's password
// @route   PUT /api/admin/users/reset-password
const adminResetPassword = async (req, res) => {
    const { clientId, newPassword } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const sql = 'UPDATE clients SET password = $1 WHERE id = $2 RETURNING id, name, email';
        const { rows } = await db.query(sql, [hashedPassword, clientId]);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Client not found' });
        }

        res.json({ msg: 'Password updated successfully for ' + rows[0].name });

    } catch (err) {
        console.error('DB Error in adminResetPassword:', err.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {
  adminCreateClient,
  adminResetPassword,
};

