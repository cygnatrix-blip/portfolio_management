const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// @desc    Register a new client
// @route   POST /api/auth/register
const registerClient = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const userExists = await db.query('SELECT * FROM clients WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'Client with that email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save new client to database. The 'role' column has a default value of 'client'
    // so we don't need to specify it here.
    const sql = 'INSERT INTO clients (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role';
    const { rows } = await db.query(sql, [name, email, hashedPassword]);
    
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('DB Error in registerClient:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Authenticate client & get token
// @route   POST /api/auth/login
const loginClient = async (req, res) => {
    const { email, password } = req.body;
    try {
        // --- THIS IS THE FIRST CHANGE ---
        // The query now also fetches the 'role' column
        const { rows } = await db.query('SELECT * FROM clients WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        const client = rows[0];

        // Check if password matches
        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // --- THIS IS THE SECOND CHANGE ---
        // The JWT payload now includes the client's role from the database
        const payload = {
            client: {
                id: client.id,
                role: client.role // Include the role in the token
            },
        };

        // Sign and return the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Server Error in loginClient:', err.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {
  registerClient,
  loginClient,
};
